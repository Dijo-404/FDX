#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(resolve(root, "frontend/app.js"), "utf8");
assert.match(
  appSource,
  /const DETECTION_CACHE_VERSION = 7;/,
  "Detection cache was not invalidated for the updated matching pipeline",
);
assert.match(
  appSource,
  /modelSignature: DETECTION_MODEL_CACHE_SIGNATURE/,
  "Detection cache entries are not tied to the RetinaFace/AdaFace model signature",
);
assert.match(
  appSource,
  /const MIN_CROPPED_TARGET_FACE_SIZE_PX = 30;/,
  "Manually selected low-resolution targets do not have the 30px enrollment floor",
);
assert.match(
  appSource,
  /identityId: targetIdentitySelect\.value \|\| null/,
  "Drawn targets cannot be explicitly linked to an existing identity",
);
for (const removedDeadSymbol of [
  "addCandidateEmbeddings",
  "selectMatchCandidates",
  "createFaceCandidateFile",
  "BACKEND_FAST",
]) {
  assert.doesNotMatch(
    appSource,
    new RegExp(`\\b${removedDeadSymbol}\\b`),
    `Dead frontend symbol is still present: ${removedDeadSymbol}`,
  );
}
const uploadQueueStart = appSource.indexOf("async function processDetectionUploadQueue(");
const uploadQueueEnd = appSource.indexOf(
  "function ensureDetectionUploadInsertionAnchor(",
  uploadQueueStart,
);
assert(uploadQueueStart >= 0 && uploadQueueEnd > uploadQueueStart, "Upload queue not found");
const uploadQueueFunction = appSource.slice(uploadQueueStart, uploadQueueEnd);
assert.match(
  uploadQueueFunction,
  /await rescoreDetectionUploadResultsForSourceExpansion\(/,
  "Expanded identities are not applied to the completed in-memory results",
);
assert.doesNotMatch(
  uploadQueueFunction,
  /requestCurrentDetectionSourceRefresh/,
  "Detection completion still starts a second source scan",
);
assert.match(
  appSource,
  /function deferUnpublishedDetectionResult\(/,
  "Unmatched face embeddings are not retained for the completion rescore",
);
assert.match(
  appSource,
  /async function restoreDeferredImageResult\(/,
  "Newly recovered image matches cannot be restored without another scan",
);
const completionRescoreStart = appSource.indexOf("function deferUnpublishedDetectionResult(");
const completionRescoreEnd = appSource.indexOf(
  "function countPublishedDetectionResults(",
  completionRescoreStart,
);
assert(
  completionRescoreStart >= 0 && completionRescoreEnd > completionRescoreStart,
  "Completion rescore functions not found",
);
const completionRescoreFunctions = appSource.slice(
  completionRescoreStart,
  completionRescoreEnd,
);
const completionHarness = Function(`
  "use strict";
  let processingGeneration = 7;
  let restoredImageCount = 0;
  const detectionUploadInsertionAnchor = {};
  const results = {
    insertBefore(article) {
      article.isConnected = true;
    },
  };
  const URL = {
    createObjectURL() {
      return "blob:restored";
    },
  };

  function hasSearchableTargets() {
    return true;
  }

  function clearFaceTargetMatch(face) {
    const clearedFace = { ...face };
    delete clearedFace.match;
    delete clearedFace.fastMatch;
    return clearedFace;
  }

  function releaseDetectionResultNode(node) {
    node.released = true;
    node.imageAnalysis = null;
    node.videoAnalysis = null;
  }

  function refreshFaceTargetMatch(face) {
    if (face.recoveredByPose) {
      face.match = { isMatch: true };
    } else {
      delete face.match;
    }
  }

  function getResultStateForTargetMatches(faces) {
    return faces.some((face) => face.match?.isMatch) ? "match" : "no-match";
  }

  function refreshImageTargetMatches() {}
  function refreshVideoTargetMatches() {}
  function refreshTrackTargetLabels() {}
  function ensureDetectionUploadInsertionAnchor() {}
  function updateResultCount() {}

  async function loadImage() {
    restoredImageCount += 1;
    return { naturalWidth: 100, naturalHeight: 100 };
  }

  function drawImage() {}
  function createDetectionSummary() {
    return "1 face detected · 1 target match";
  }

  function setResultState(node, state) {
    node.article.dataset.resultState = state;
  }

  async function installCompletedVideoAnalysis() {
    return "match";
  }

  ${completionRescoreFunctions}
  return {
    deferUnpublishedDetectionResult,
    rescoreDetectionUploadResultsForSourceExpansion,
    getRestoredImageCount: () => restoredImageCount,
  };
`)();

function createCompletionHarnessNode(recoveredByPose) {
  return {
    article: {
      dataset: { resultState: "no-match" },
      isConnected: false,
    },
    imageAnalysis: {
      image: {},
      faces: [{ recoveredByPose }],
    },
    videoAnalysis: null,
    videoOverlay: { width: 0, height: 0 },
    downloadButton: { href: "" },
    canvas: {},
    summary: {
      classList: { remove() {} },
      textContent: "",
    },
    cacheHit: true,
    released: false,
    file: {},
  };
}

const recoveredNode = createCompletionHarnessNode(true);
const rejectedNode = createCompletionHarnessNode(false);
completionHarness.deferUnpublishedDetectionResult(recoveredNode);
completionHarness.deferUnpublishedDetectionResult(rejectedNode);
assert.equal(recoveredNode.released, true, "Unpublished image media was not released");
assert.equal(
  recoveredNode.deferredImageFaces.length,
  1,
  "Unpublished face embeddings were not retained",
);
await completionHarness.rescoreDetectionUploadResultsForSourceExpansion(
  [recoveredNode, rejectedNode],
  7,
);
assert.equal(recoveredNode.article.isConnected, true, "Recovered match was not published");
assert.equal(recoveredNode.article.dataset.resultState, "match", "Recovered result state is wrong");
assert.equal(recoveredNode.released, false, "Recovered image was not restored");
assert.equal(rejectedNode.article.isConnected, false, "Rejected non-match was published");
assert.equal(
  completionHarness.getRestoredImageCount(),
  1,
  "Completion rescore reopened more than the newly matched images",
);

const qualityStart = appSource.indexOf("function getFaceMatchQuality(");
const qualityEnd = appSource.indexOf("function addRealtimeTargetMatch(", qualityStart);
assert(qualityStart >= 0 && qualityEnd > qualityStart, "Face-quality function not found");
const qualityHarness = Function(`
  "use strict";
  const MIN_MATCH_FACE_SIZE_PX = 40;
  const GOOD_MATCH_FACE_SIZE_PX = 80;
  const MIN_MATCH_DETECTION_PROBABILITY = 0.80;
  ${appSource.slice(qualityStart, qualityEnd)}
  return getFaceMatchQuality;
`)();
const selectedCropFace = {
  box: { probability: 0.9995 },
  quality: {
    source_face_width: 33.44,
    source_face_height: 39.85,
  },
};
assert.equal(
  qualityHarness(selectedCropFace).isMatchable,
  false,
  "Ordinary source matching unexpectedly accepts a sub-40px face",
);
assert.equal(
  qualityHarness(selectedCropFace, { minimumFaceSize: 30 }).isMatchable,
  true,
  "Explicitly selected target crop is still rejected below the ordinary 40px floor",
);
assert.equal(
  qualityHarness(selectedCropFace, { minimumFaceSize: 30 }).quality.level,
  "low",
  "Selected 30-39px crop was not classified as a low-resolution reference",
);

const identityLinkStart = appSource.indexOf("function linkTargetEntryToIdentity(");
const identityLinkEnd = appSource.indexOf(
  "function reuseExistingTargetIdentity(",
  identityLinkStart,
);
assert(
  identityLinkStart >= 0 && identityLinkEnd > identityLinkStart,
  "Explicit identity-link function not found",
);
const identityLinkHarness = Function(`
  "use strict";
  const targetFaces = [{
    id: "portrait",
    identityId: "target:portrait",
    name: "Current person",
    accurateEmbedding: [1, 0, 0],
  }];
  function getTargetIdentityKey(target) {
    return target.identityId || \`target:\${target.id}\`;
  }
  function hasTargetEmbedding(target) {
    return Array.isArray(target.accurateEmbedding);
  }
  function getTargetLabel(target) {
    return target.name;
  }
  ${appSource.slice(identityLinkStart, identityLinkEnd)}
  return linkTargetEntryToIdentity;
`)();
const selectedCropEntry = {
  id: "crop",
  identityId: "target:crop",
  name: "DSC08446",
};
assert.equal(
  identityLinkHarness(selectedCropEntry, "target:portrait"),
  true,
  "Selected crop was not linked to the operator-chosen identity",
);
assert.equal(
  selectedCropEntry.identityId,
  "target:portrait",
  "Selected crop retained a separate identity",
);
assert.equal(
  selectedCropEntry.displayName,
  "Current person",
  "Selected crop did not inherit the chosen identity name",
);

const expansionStart = appSource.indexOf("function expandSourceIdentityProfile(");
const expansionEnd = appSource.indexOf(
  "function averageSourceIdentityEmbeddings(",
  expansionStart,
);
assert(expansionStart >= 0 && expansionEnd > expansionStart, "Expansion functions not found");

const similarityStart = appSource.indexOf("function getIdentityProfileSimilarity(");
const similarityEnd = appSource.indexOf(
  "function createIdentityProfiles(",
  similarityStart,
);
assert(similarityStart >= 0 && similarityEnd > similarityStart, "Similarity function not found");

const expansionFunctions = appSource.slice(expansionStart, expansionEnd);
const similarityFunction = appSource.slice(similarityStart, similarityEnd);
const logic = Function(`
  "use strict";
  const SOURCE_IDENTITY_BOOTSTRAP_COSINE = 0.68;
  const SOURCE_IDENTITY_WEAK_BOOTSTRAP_COSINE = 0.59;
  const SOURCE_IDENTITY_WEAK_CONSENSUS_COSINE = 0.68;
  const SOURCE_IDENTITY_WEAK_MIN_INDEPENDENT_SAMPLES = 3;
  const SOURCE_IDENTITY_BRIDGE_COSINE = 0.65;
  const SOURCE_IDENTITY_SUPPORT_COSINE = 0.58;
  const SOURCE_IDENTITY_TRACK_MIN_COSINE = 0.10;
  const SOURCE_IDENTITY_TRACK_MAX_CENTER_DISTANCE = 0.08;
  const SOURCE_IDENTITY_TRACK_MAX_SIZE_RATIO = 1.35;
  const SOURCE_IDENTITY_TRACK_MIN_INDEPENDENT_SEEDS = 2;
  const MIN_MATCH_DETECTION_PROBABILITY = 0.80;

  function getEmbeddingSimilarity(first, second) {
    if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) {
      return null;
    }
    return first.reduce((sum, value, index) => sum + value * second[index], 0);
  }

  ${similarityFunction}
  ${expansionFunctions}
  return {
    createSourceIdentityTrackingOrigins,
    expandSourceIdentityProfile,
    expandSourceIdentityThroughTrackedPoses,
    findWeakSourceIdentityConsensus,
    getIdentityProfileSimilarity,
    hasSourceIdentitySampleCollision,
    resolveSourceIdentitySampleCollisions,
  };
`)();

function normalize(values) {
  const norm = Math.hypot(...values);
  return values.map((value) => value / norm);
}

function sample({
  key,
  sourceKey,
  embedding,
  probability = 0.99,
  sequenceGroup = null,
  sequenceIndex = null,
  centerX = 0.25,
  centerY = 0.25,
  widthRatio = 0.10,
  heightRatio = 0.12,
}) {
  return {
    key,
    sourceKey,
    embedding: normalize(embedding),
    embeddingNorm: 20,
    detectionProbability: probability,
    sequenceGroup,
    sequenceIndex,
    centerX,
    centerY,
    widthRatio,
    heightRatio,
  };
}

const gallery = normalize([1, 0, 0]);
const baseOne = sample({
  key: "base-1",
  sourceKey: "base-photo-1",
  embedding: [0.95, 0.31, 0],
});
const baseTwo = sample({
  key: "base-2",
  sourceKey: "base-photo-2",
  embedding: [0.92, 0.39, 0],
});
const trackingOnlyOne = sample({
  key: "tracking-only-1",
  sourceKey: "sequence-a-10",
  embedding: [0.72, 0.69, 0],
  probability: 0.75,
  sequenceGroup: "sequence-a#.jpg",
  sequenceIndex: 10,
});
const trackingOnlyTwo = sample({
  key: "tracking-only-2",
  sourceKey: "sequence-b-20",
  embedding: [0.71, 0.70, 0],
  probability: 0.76,
  sequenceGroup: "sequence-b#.jpg",
  sequenceIndex: 20,
  centerX: 0.60,
});
const poseOne = sample({
  key: "pose-1",
  sourceKey: "sequence-a-11",
  embedding: [0.20, 0.98, 0],
  sequenceGroup: "sequence-a#.jpg",
  sequenceIndex: 11,
});
const poseTwo = sample({
  key: "pose-2",
  sourceKey: "sequence-b-21",
  embedding: [0.22, 0.98, 0],
  sequenceGroup: "sequence-b#.jpg",
  sequenceIndex: 21,
  centerX: 0.60,
});
const reliableCandidates = [baseOne, baseTwo, poseOne, poseTwo];
const trackingCandidates = [
  ...reliableCandidates,
  trackingOnlyOne,
  trackingOnlyTwo,
];
const profile = { identityKey: "target", embedding: gallery };
const baseSamples = logic.resolveSourceIdentitySampleCollisions(
  logic.expandSourceIdentityProfile(profile, reliableCandidates),
  gallery,
);
const trackingOrigins = logic.createSourceIdentityTrackingOrigins(
  profile,
  baseSamples,
  trackingCandidates,
);
const poseGroups = logic.expandSourceIdentityThroughTrackedPoses(
  baseSamples,
  trackingOrigins,
  reliableCandidates,
  trackingCandidates,
);

assert.equal(baseSamples.length, 2, "Reliable base cluster changed unexpectedly");
assert.equal(poseGroups.length, 2, "Validated pose cluster was not added");
assert.deepEqual(
  poseGroups.map((group) => group.length),
  [2, 2],
  "Pose centroids must retain separate sample groups",
);
assert(
  poseGroups.flat().every((entry) => entry.detectionProbability >= 0.80),
  "Tracking-only samples leaked into a centroid",
);
assert(
  poseGroups.every((group) => !logic.hasSourceIdentitySampleCollision(group)),
  "A mixed-photo pose group was accepted",
);

const collidingPose = sample({
  key: "pose-collision",
  sourceKey: poseOne.sourceKey,
  embedding: [0.18, 0.98, 0],
});
const rejectedPoseGroups = logic.expandSourceIdentityThroughTrackedPoses(
  baseSamples,
  trackingOrigins,
  [...reliableCandidates, collidingPose],
  [...trackingCandidates, collidingPose],
);
assert.equal(
  rejectedPoseGroups.length,
  1,
  "A tracked pose cluster containing two faces from one photo was not rejected",
);

const preferredBase = sample({
  key: "preferred",
  sourceKey: "ambiguous-photo",
  embedding: [0.94, 0.34, 0],
});
const rejectedBase = sample({
  key: "rejected",
  sourceKey: "ambiguous-photo",
  embedding: [0.70, 0.71, 0],
});
assert.deepEqual(
  logic.resolveSourceIdentitySampleCollisions(
    [rejectedBase, preferredBase],
    gallery,
  ).map((entry) => entry.key),
  ["preferred"],
  "Base collision did not retain the face closest to the enrolled gallery",
);

const weakOne = sample({
  key: "weak-1",
  sourceKey: "weak-photo-1",
  embedding: [0.62, 0.78, 0],
});
const weakTwo = sample({
  key: "weak-2",
  sourceKey: "weak-photo-2",
  embedding: [0.61, 0.78, 0.05],
});
const weakThree = sample({
  key: "weak-3",
  sourceKey: "weak-photo-3",
  embedding: [0.60, 0.79, -0.04],
});
const weakSamePhoto = sample({
  key: "weak-same-photo",
  sourceKey: weakThree.sourceKey,
  embedding: [0.59, 0.80, -0.04],
});
const repeatedLookalike = sample({
  key: "repeated-lookalike",
  sourceKey: "lookalike-photo",
  embedding: [0.60, -0.80, 0],
});
const weakConsensus = logic.findWeakSourceIdentityConsensus({
  embedding: gallery,
  allowsWeakSourceConsensus: true,
}, [
  weakOne,
  weakTwo,
  weakThree,
  weakSamePhoto,
  repeatedLookalike,
]);
assert.deepEqual(
  weakConsensus.map((entry) => entry.key),
  ["weak-1", "weak-2", "weak-3"],
  "Low-resolution consensus did not retain exactly one cohesive face from three photographs",
);
assert.deepEqual(
  logic.findWeakSourceIdentityConsensus({
    embedding: gallery,
    allowsWeakSourceConsensus: false,
  }, [weakOne, weakTwo, weakThree]),
  [],
  "Weak consensus was enabled for a normal-quality gallery",
);

const poseProbe = poseOne.embedding;
const poseSimilarity = logic.getIdentityProfileSimilarity(poseProbe, {
  embedding: gallery,
  sourceExpandedEmbeddings: [poseTwo.embedding],
});
assert(
  poseSimilarity > 0.99,
  "Matching did not compare the probe against the separate pose centroid",
);

console.log(JSON.stringify({
  status: "OK",
  baseSamples: baseSamples.length,
  poseGroups: poseGroups.length,
  trackingOnlySamplesInCentroids: 0,
  mixedPhotoPoseRejected: true,
  weakConsensusSamples: weakConsensus.length,
  weakConsensusLookalikeRejected: true,
  separatePoseSimilarity: Number(poseSimilarity.toFixed(4)),
  completionRescoreRestoredImages: completionHarness.getRestoredImageCount(),
  completionSourceReplay: false,
}, null, 2));
