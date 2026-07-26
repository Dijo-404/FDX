#!/usr/bin/env python3
"""Audit FDX's low-resolution source consensus against a cached CDC scan."""

from __future__ import annotations

import argparse
import collections
import json
import math
import time
from pathlib import Path

import numpy as np


ORDINARY_BOOTSTRAP = 0.68
ORDINARY_BRIDGE = 0.65
ORDINARY_SUPPORT = 0.58
WEAK_BOOTSTRAP = 0.59
WEAK_CONSENSUS = 0.68
WEAK_MIN_PHOTOS = 3
MIN_SOURCE_SIZE = 30
MIN_MATCH_SIZE = 40
GOOD_MATCH_SIZE = 80
MIN_TRACK_PROBABILITY = 0.70
MIN_MATCH_PROBABILITY = 0.80
GOOD_MATCH_THRESHOLD = 0.60
LOW_MATCH_THRESHOLD = 0.65


def load_scan(path: Path) -> dict[str, list[dict]]:
    datasets: dict[str, list[dict]] = collections.defaultdict(list)
    with path.open() as source:
        for line in source:
            if line.strip():
                row = json.loads(line)
                datasets[row["dataset"]].append(row)
    return datasets


class Dataset:
    def __init__(self, name: str, images: list[dict]):
        self.name = name
        self.images = sorted(images, key=lambda image: image["name"])
        self.faces: list[dict] = []
        self.source_samples: list[dict] = []

        for source_id, image in enumerate(self.images):
            for face_index, face in enumerate(image["faces"]):
                embedding = face.get("embedding")
                if not isinstance(embedding, list) or len(embedding) != 512:
                    continue
                box = face["box"]
                width = box["x_max"] - box["x_min"]
                height = box["y_max"] - box["y_min"]
                sample = {
                    "key": f"{image['name']}:{face_index}",
                    "source_id": source_id,
                    "face_index": face_index,
                    "embedding": np.asarray(embedding, dtype=np.float32),
                    "embedding_norm": float(face.get("embedding_norm") or 1),
                    "probability": float(box["probability"]),
                    "width": width,
                    "height": height,
                }
                self.faces.append(sample)
                if (
                    width >= MIN_SOURCE_SIZE
                    and height >= MIN_SOURCE_SIZE
                    and sample["probability"] >= MIN_TRACK_PROBABILITY
                ):
                    self.source_samples.append(sample)

        self.embeddings = np.stack(
            [sample["embedding"] for sample in self.source_samples],
        )
        self.similarity = self.embeddings @ self.embeddings.T
        self.source_ids = np.asarray(
            [sample["source_id"] for sample in self.source_samples],
        )
        self.reliable = np.asarray(
            [
                sample["probability"] >= MIN_MATCH_PROBABILITY
                for sample in self.source_samples
            ],
        )
        self.face_embeddings = np.stack([face["embedding"] for face in self.faces])
        self.face_matchable = np.asarray(
            [
                face["width"] >= MIN_MATCH_SIZE
                and face["height"] >= MIN_MATCH_SIZE
                and face["probability"] >= MIN_MATCH_PROBABILITY
                for face in self.faces
            ],
        )
        self.face_thresholds = np.asarray(
            [
                GOOD_MATCH_THRESHOLD
                if face["width"] >= GOOD_MATCH_SIZE
                and face["height"] >= GOOD_MATCH_SIZE
                else LOW_MATCH_THRESHOLD
                for face in self.faces
            ],
            dtype=np.float32,
        )
    def similarities(self, embedding: np.ndarray) -> np.ndarray:
        return self.embeddings @ embedding

    def resolve_photo_collisions(
        self,
        indices: np.ndarray,
        gallery_scores: np.ndarray,
    ) -> np.ndarray:
        closest_by_photo: dict[int, int] = {}
        for index in map(int, indices):
            source_id = self.source_samples[index]["source_id"]
            previous = closest_by_photo.get(source_id)
            if previous is None or gallery_scores[index] > gallery_scores[previous]:
                closest_by_photo[source_id] = index
        return np.asarray(list(closest_by_photo.values()), dtype=int)

    def ordinary_base(
        self,
        embedding: np.ndarray,
        excluded_source_id: int | None = None,
    ) -> np.ndarray:
        gallery_scores = self.similarities(embedding)
        pool = self.reliable.copy()
        if excluded_source_id is not None:
            pool &= self.source_ids != excluded_source_id
        accepted = pool & (gallery_scores >= ORDINARY_BOOTSTRAP)

        while True:
            accepted_indices = np.flatnonzero(accepted)
            top_one = gallery_scores.copy()
            top_two = np.full(
                len(self.source_samples),
                -np.inf,
                dtype=np.float32,
            )
            for source_id in np.unique(self.source_ids[accepted_indices]):
                source_indices = accepted_indices[
                    self.source_ids[accepted_indices] == source_id
                ]
                source_scores = self.similarity[:, source_indices].max(axis=1)
                better = source_scores > top_one
                top_two[better] = top_one[better]
                top_one[better] = source_scores[better]
                between = ~better & (source_scores > top_two)
                top_two[between] = source_scores[between]
            additions = (
                pool
                & ~accepted
                & (top_one >= ORDINARY_BRIDGE)
                & (top_two >= ORDINARY_SUPPORT)
            )
            if not additions.any():
                break
            accepted |= additions

        return self.resolve_photo_collisions(np.flatnonzero(accepted), gallery_scores)

    def weak_consensus(
        self,
        embedding: np.ndarray,
        excluded_source_id: int | None = None,
    ) -> np.ndarray:
        gallery_scores = self.similarities(embedding)
        pool = self.reliable.copy()
        if excluded_source_id is not None:
            pool &= self.source_ids != excluded_source_id
        candidates = self.resolve_photo_collisions(
            np.flatnonzero(pool & (gallery_scores >= WEAK_BOOTSTRAP)),
            gallery_scores,
        )
        candidates = candidates[np.argsort(gallery_scores[candidates])[::-1]]
        if len(candidates) < WEAK_MIN_PHOTOS:
            return np.asarray([], dtype=int)

        consensus = [int(candidates[0])]
        for candidate in map(int, candidates[1:]):
            if all(
                float(self.similarity[candidate, support]) >= WEAK_CONSENSUS
                for support in consensus
            ):
                consensus.append(candidate)
        return (
            np.asarray(consensus, dtype=int)
            if len(consensus) >= WEAK_MIN_PHOTOS
            else np.asarray([], dtype=int)
        )

    def centroid(self, indices: np.ndarray) -> np.ndarray:
        weights = np.asarray(
            [
                self.source_samples[int(index)]["embedding_norm"]
                for index in indices
            ],
            dtype=np.float32,
        )
        embedding = np.average(self.embeddings[indices], axis=0, weights=weights)
        return embedding / np.linalg.norm(embedding)

    def matches(
        self,
        target: np.ndarray,
        expansion: np.ndarray | None = None,
    ) -> set[tuple[int, int]]:
        centroid = self.centroid(expansion) if expansion is not None else None
        scores = self.face_embeddings @ target
        if centroid is not None:
            scores = np.maximum(scores, self.face_embeddings @ centroid)
        accepted = np.flatnonzero(
            self.face_matchable & (scores >= self.face_thresholds),
        )
        return {
            (
                self.faces[int(index)]["source_id"],
                self.faces[int(index)]["face_index"],
            )
            for index in accepted
        }

    def audit_low_references(self) -> tuple[dict, list[dict]]:
        references = [
            sample
            for sample in self.source_samples
            if (
                sample["probability"] >= MIN_MATCH_PROBABILITY
                and sample["width"] >= MIN_MATCH_SIZE
                and sample["height"] >= MIN_MATCH_SIZE
                and (
                    sample["width"] < GOOD_MATCH_SIZE
                    or sample["height"] < GOOD_MATCH_SIZE
                )
            )
        ]
        summary = {
            "dataset": self.name,
            "images": len(self.images),
            "faces": len(self.faces),
            "low_resolution_references": len(references),
            "weak_consensus_activations": 0,
            "gained_face_matches": 0,
            "lost_face_matches": 0,
            "new_same_photo_other_face_matches": 0,
            "multi_face_source_expansions": 0,
        }
        cases = []
        for reference in references:
            target = reference["embedding"]
            ordinary = self.ordinary_base(target, reference["source_id"])
            if len(ordinary) >= 2:
                continue
            weak = self.weak_consensus(target, reference["source_id"])
            if len(weak) < WEAK_MIN_PHOTOS:
                continue

            summary["weak_consensus_activations"] += 1
            source_counts = collections.Counter(
                self.source_samples[int(index)]["source_id"] for index in weak
            )
            collision = any(count > 1 for count in source_counts.values())
            summary["multi_face_source_expansions"] += int(collision)

            before = self.matches(target)
            after = self.matches(target, weak)
            gained = after - before
            lost = before - after
            summary["gained_face_matches"] += len(gained)
            summary["lost_face_matches"] += len(lost)
            same_photo = {
                match
                for match in gained
                if (
                    match[0] == reference["source_id"]
                    and match[1] != reference["face_index"]
                )
            }
            summary["new_same_photo_other_face_matches"] += len(same_photo)
            cases.append(
                {
                    "target": reference["key"],
                    "ordinary_samples": len(ordinary),
                    "weak_samples": len(weak),
                    "matches_before": len(before),
                    "matches_after": len(after),
                    "gained": len(gained),
                    "same_photo_other_faces": len(same_photo),
                    "weak_sample_keys": [
                        self.source_samples[int(index)]["key"] for index in weak
                    ],
                }
            )
        return summary, cases

    def face(self, key: str) -> dict:
        return next(face for face in self.faces if face["key"] == key)

    def external_case(self, target: dict) -> dict:
        embedding = target["embedding"]
        ordinary = self.ordinary_base(embedding)
        weak = (
            self.weak_consensus(embedding)
            if len(ordinary) < 2
            else np.asarray([], dtype=int)
        )
        before = self.matches(embedding)
        after = self.matches(embedding, weak) if len(weak) >= WEAK_MIN_PHOTOS else before
        return {
            "source_dataset": self.name,
            "target": target["key"],
            "target_size": [target["width"], target["height"]],
            "ordinary_samples": len(ordinary),
            "weak_samples": len(weak),
            "matched_images_before": len({source_id for source_id, _ in before}),
            "matched_images_after": len({source_id for source_id, _ in after}),
            "matched_faces_before": len(before),
            "matched_faces_after": len(after),
            "weak_sample_keys": [
                self.source_samples[int(index)]["key"] for index in weak
            ],
            "matched_image_names_after": [
                self.images[source_id]["name"]
                for source_id in sorted({source_id for source_id, _ in after})
            ],
        }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scan", type=Path, required=True)
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("/tmp/fdx-cdc-weak-consensus-report.json"),
    )
    args = parser.parse_args()
    if not args.scan.is_file():
        raise SystemExit(f"CDC scan not found: {args.scan}")

    started = time.monotonic()
    datasets = {
        name: Dataset(name, images)
        for name, images in load_scan(args.scan).items()
    }
    summaries = []
    cases = {}
    for name in sorted(datasets):
        summary, dataset_cases = datasets[name].audit_low_references()
        summaries.append(summary)
        cases[name] = dataset_cases
        print(json.dumps(summary), flush=True)

    target = datasets["dataset-1"].face("DSC08408.JPG:0")
    cross_dataset_case = datasets["dataset-3"].external_case(target)
    report = {
        "status": "OK",
        "thresholds": {
            "ordinary_source_probability": MIN_MATCH_PROBABILITY,
            "tracking_evidence_probability": MIN_TRACK_PROBABILITY,
            "weak_gallery_similarity": WEAK_BOOTSTRAP,
            "weak_pairwise_consensus": WEAK_CONSENSUS,
            "weak_min_independent_photos": WEAK_MIN_PHOTOS,
        },
        "summaries": summaries,
        "cross_dataset_case": cross_dataset_case,
        "cases": cases,
        "elapsed_seconds": round(time.monotonic() - started, 2),
    }
    totals = {
        key: sum(summary[key] for summary in summaries)
        for key in (
            "images",
            "faces",
            "low_resolution_references",
            "weak_consensus_activations",
            "gained_face_matches",
            "lost_face_matches",
            "new_same_photo_other_face_matches",
            "multi_face_source_expansions",
        )
    }
    report["totals"] = totals
    if (
        totals["lost_face_matches"]
        or totals["new_same_photo_other_face_matches"]
        or totals["multi_face_source_expansions"]
    ):
        report["status"] = "FAILED"
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"totals": totals, "cross_dataset_case": cross_dataset_case}, indent=2))
    print(f"Saved {args.report} in {report['elapsed_seconds']}s")
    if report["status"] != "OK":
        raise SystemExit("CDC weak-consensus safety audit failed")


if __name__ == "__main__":
    main()
