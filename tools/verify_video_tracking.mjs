#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../frontend/app.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../frontend/index.html", import.meta.url), "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = appSource.indexOf(marker);
  assert.notEqual(start, -1, `Missing ${name}`);
  const bodyStart = appSource.indexOf(") {", start) + 2;
  assert.ok(bodyStart > 1, `Missing body for ${name}`);
  let depth = 0;

  for (let index = bodyStart; index < appSource.length; index += 1) {
    if (appSource[index] === "{") depth += 1;
    if (appSource[index] === "}") depth -= 1;
    if (depth === 0) return appSource.slice(start, index + 1);
  }

  throw new Error(`Could not parse ${name}`);
}

const functionNames = [
  "isVideoDetectionFile",
  "assignFaceTracks",
  "calculateTrackScore",
  "createTrack",
  "updateTrack",
  "getTrackingEmbedding",
  "getEmbeddingSimilarity",
  "boxIntersectionOverUnion",
  "createConfirmedVideoAnalysis",
  "getVideoSampleForTime",
];
const testSource = `
const TRACK_MIN_IOU = 0.12;
const TRACK_MIN_EMBEDDING_SIMILARITY = 0.65;
const getFaceAccurateEmbedding = (face) => face.embedding || null;
const getFaceFastEmbedding = () => null;
${functionNames.map(extractFunction).join("\n")}
globalThis.videoTracking = {
  isVideoDetectionFile,
  assignFaceTracks,
  createConfirmedVideoAnalysis,
  getVideoSampleForTime,
};
`;
const context = {};
vm.runInNewContext(testSource, context);
const {
  isVideoDetectionFile,
  assignFaceTracks,
  createConfirmedVideoAnalysis,
  getVideoSampleForTime,
} = context.videoTracking;

assert.equal(isVideoDetectionFile({ type: "video/mp4", name: "clip.bin" }), true);
assert.equal(isVideoDetectionFile({ type: "", name: "clip.MOV" }), true);
assert.equal(isVideoDetectionFile({ type: "image/jpeg", name: "photo.jpg" }), false);

const box = (xMin, xMax) => ({ x_min: xMin, y_min: 0, x_max: xMax, y_max: 10, probability: 0.95 });
const tracks = [];
let nextTrackId = assignFaceTracks([
  { box: box(0, 10), embedding: [1, 0] },
  { box: box(20, 30), embedding: [0, 1] },
], tracks, 0, 1 / 30, 1);
const crossingFaces = [
  { box: box(20, 30), embedding: [1, 0] },
  { box: box(0, 10), embedding: [0, 1] },
];
nextTrackId = assignFaceTracks(crossingFaces, tracks, 1 / 30, 1 / 30, nextTrackId);

assert.equal(nextTrackId, 3, "Crossing faces should not create replacement tracks");
assert.equal(crossingFaces[0].track.id, 1, "Embedding should preserve the first face ID across a crossing");
assert.equal(crossingFaces[1].track.id, 2, "Embedding should preserve the second face ID across a crossing");

const samples = [
  { timestamp: 0, faces: [{ track: { id: 1 } }] },
  { timestamp: 1 / 30, faces: [{ track: { id: 1 } }] },
  { timestamp: 2 / 30, faces: [{ track: { id: 2 } }] },
];
const confirmed = createConfirmedVideoAnalysis(samples, [
  { id: 1, appearances: 2 },
  { id: 2, appearances: 1 },
]);
assert.deepEqual(Array.from(confirmed.confirmedTracks, (track) => track.id), [1]);
assert.equal(confirmed.playbackSamples[2].faces.length, 0, "One-frame false positives should be removed");
assert.equal(getVideoSampleForTime(samples, 0.034, 1 / 30).timestamp, 1 / 30);
assert.equal(getVideoSampleForTime(samples, 1, 1 / 30), null, "Stale boxes should not remain on screen");

assert.match(htmlSource, /id="folderInput"[^>]+accept="image\/\*,video\/\*"/);
assert.doesNotMatch(htmlSource, /id="fileInput"/);
assert.match(htmlSource, /id="detectionUploadButton"[^>]*>Choose media folder<\/button>/);
assert.match(appSource, /drawVideoOverlay\(overlay, samples, playbackTime, sampleInterval\)/);
assert.match(appSource, /drawReticle\(context, xMin, yMin, width, height, color\)/);

console.log("Video upload and frame tracking checks: OK");
