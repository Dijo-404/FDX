const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const targetFileInput = document.querySelector("#targetFileInput");
const targetDropzone = document.querySelector("#targetDropzone");
const targetNameInput = document.querySelector("#targetNameInput");
const results = document.querySelector("#results");
const template = document.querySelector("#resultTemplate");
const faceTemplate = document.querySelector("#faceTemplate");
const statusText = document.querySelector("#status");
const clearButton = document.querySelector("#clear");
const clearFacesButton = document.querySelector("#clearFaces");
const threshold = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#thresholdValue");
const videoInterval = document.querySelector("#videoInterval");
const resultCount = document.querySelector("#resultCount");
const pageTabs = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll("[data-page]");
const facesGrid = document.querySelector("#facesGrid");
const facesEmpty = document.querySelector("#facesEmpty");
const faceCount = document.querySelector("#faceCount");

const MATCH_SIMILARITY_THRESHOLD = 0.8;
const TARGET_DETECTION_THRESHOLD = "0.55";
const TARGET_STORAGE_KEY = "fdx.targetFaces";
const VIDEO_MAX_FRAMES = 600;
const VIDEO_MAX_SIDE = 1280;
const TRACK_MIN_IOU = 0.12;
const TRACK_MIN_EMBEDDING_SIMILARITY = 0.65;
const targetFaces = loadStoredTargetFaces();
let similarityCoefficients = [0, 1];
let processingGeneration = 0;

pageTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showPage(tab.dataset.pageTarget);
  });
});

window.addEventListener("hashchange", () => {
  showPage(getPageFromHash(), false);
});

threshold.addEventListener("input", () => {
  thresholdValue.value = Number(threshold.value).toFixed(2);
});

clearButton.addEventListener("click", () => {
  processingGeneration += 1;
  results.querySelectorAll("video").forEach((video) => {
    URL.revokeObjectURL(video.src);
  });
  results.replaceChildren();
  fileInput.value = "";
  updateResultCount();
});

clearFacesButton.addEventListener("click", () => {
  targetFaces.splice(0, targetFaces.length);
  saveTargetFaces();
  renderTargetFaces();
});

fileInput.addEventListener("change", () => {
  handleFiles(fileInput.files);
});

targetFileInput.addEventListener("change", () => {
  handleTargetFiles(targetFileInput.files);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  handleFiles(event.dataTransfer.files);
});

targetDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  targetDropzone.classList.add("dragover");
});

targetDropzone.addEventListener("dragleave", () => {
  targetDropzone.classList.remove("dragover");
});

targetDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  targetDropzone.classList.remove("dragover");
  handleTargetFiles(event.dataTransfer.files);
});

async function checkBackend() {
  try {
    const response = await fetch("/health");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    statusText.textContent = "Detector ready";
  } catch (error) {
    statusText.textContent = "Detector backend is still starting";
  }
}

async function loadStatus() {
  try {
    const response = await fetch("/status");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const status = await response.json();
    if (Array.isArray(status.similarity_coefficients)) {
      similarityCoefficients = status.similarity_coefficients;
    }
  } catch (error) {
    similarityCoefficients = [0, 1];
  }
}

function getPageFromHash() {
  const page = window.location.hash.replace("#", "");
  return page === "faces" ? "faces" : "detection";
}

function showPage(pageName, updateHash = true) {
  const normalizedPage = pageName === "faces" ? "faces" : "detection";

  pages.forEach((page) => {
    const isActive = page.dataset.page === normalizedPage;
    page.classList.toggle("active", isActive);
    page.hidden = !isActive;
  });

  pageTabs.forEach((tab) => {
    const isActive = tab.dataset.pageTarget === normalizedPage;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  if (updateHash && window.location.hash !== `#${normalizedPage}`) {
    history.pushState(null, "", `#${normalizedPage}`);
  }
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(
    (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
  );
  const generation = processingGeneration;

  for (const file of files) {
    if (generation !== processingGeneration) break;
    const node = createResultNode(file);
    results.prepend(node.article);
    updateResultCount();
    if (file.type.startsWith("video/")) {
      await detectVideo(file, node, generation);
    } else {
      await detectFile(file, node);
    }
  }
  fileInput.value = "";
}

function createResultNode(file) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector(".result");
  const title = fragment.querySelector("h2");
  const summary = fragment.querySelector(".summary");
  const imageStage = fragment.querySelector(".imageStage");
  const canvas = fragment.querySelector(".imageCanvas");
  const videoStage = fragment.querySelector(".videoStage");
  const video = fragment.querySelector("video");
  const videoOverlay = fragment.querySelector(".videoOverlay");
  const raw = fragment.querySelector("pre");

  title.textContent = file.name;
  summary.textContent = "Queued";
  raw.textContent = "";

  return {
    article,
    summary,
    imageStage,
    canvas,
    videoStage,
    video,
    videoOverlay,
    raw,
  };
}

async function detectFile(file, node) {
  node.summary.textContent = "Detecting";
  const image = await loadImage(file);
  drawImage(node.canvas, image, []);

  try {
    const needsMatching = targetFaces.some((target) => Array.isArray(target.embedding));
    const payload = needsMatching
      ? await findFaces(file, "calculator")
      : await findFaces(file, "");

    const faces = Array.isArray(payload.result) ? payload.result : [];
    const matchedFaces = faces.map(addBestTargetMatch);
    drawImage(node.canvas, image, matchedFaces);
    node.summary.classList.remove("error");
    node.summary.textContent = createDetectionSummary(matchedFaces);
    node.raw.textContent = JSON.stringify(addMatchDiagnostics(payload, matchedFaces), null, 2);
  } catch (error) {
    if (targetFaces.length > 0) {
      try {
        const payload = await findFaces(file, "");
        const faces = Array.isArray(payload.result) ? payload.result : [];
        drawImage(node.canvas, image, faces);
        node.summary.classList.remove("error");
        node.summary.textContent = `${faces.length} face${faces.length === 1 ? "" : "s"} detected`;
        node.raw.textContent = JSON.stringify(payload, null, 2);
        return;
      } catch (fallbackError) {
        node.summary.classList.add("error");
        node.summary.textContent = fallbackError.message;
        node.raw.textContent = "";
        return;
      }
    }

    node.summary.classList.add("error");
    node.summary.textContent = error.message;
    node.raw.textContent = "";
  }
}

async function findFaces(file, facePlugins, allowNoFaces = false) {
  const data = new FormData();
  data.append("file", file, file.name);
  const url = `/api/find_faces?face_plugins=${encodeURIComponent(facePlugins)}&limit=0&det_prob_threshold=${getApiThreshold()}`;
  const response = await fetch(url, { method: "POST", body: data });
  const payload = await response.json();

  if (!response.ok) {
    const message = payload.message || `HTTP ${response.status}`;
    if (allowNoFaces && response.status === 400 && /no face/i.test(message)) {
      return { ...payload, result: [] };
    }
    throw new Error(message);
  }

  return payload;
}

async function detectVideo(file, node, generation) {
  node.imageStage.hidden = true;
  node.videoStage.hidden = false;
  node.summary.textContent = "Loading video";

  const objectUrl = URL.createObjectURL(file);
  const decoder = document.createElement("video");
  node.video.src = objectUrl;
  node.video.controls = false;
  decoder.preload = "auto";
  decoder.muted = true;
  decoder.playsInline = true;
  decoder.src = objectUrl;

  try {
    await waitForVideoMetadata(decoder);
    await waitForVideoData(decoder);
    const duration = decoder.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Could not determine the video duration");
    }

    node.videoStage.style.aspectRatio = `${decoder.videoWidth} / ${decoder.videoHeight}`;
    const requestedInterval = getVideoInterval();
    const sampleInterval = Math.max(requestedInterval, duration / VIDEO_MAX_FRAMES);
    const timestamps = createSampleTimestamps(duration, sampleInterval);
    const frameCanvas = document.createElement("canvas");
    const tracks = [];
    const samples = [];
    let nextTrackId = 1;
    let useEmbeddings = true;

    sizeFrameCanvas(frameCanvas, decoder.videoWidth, decoder.videoHeight);
    node.videoOverlay.width = frameCanvas.width;
    node.videoOverlay.height = frameCanvas.height;

    for (let index = 0; index < timestamps.length; index += 1) {
      if (generation !== processingGeneration) return;

      const timestamp = timestamps[index];
      node.summary.textContent = `Analyzing frame ${index + 1} of ${timestamps.length} · ${formatTime(timestamp)}`;
      await seekVideo(decoder, timestamp);
      captureVideoFrame(decoder, frameCanvas);
      const frameFile = await canvasToFile(frameCanvas, file.name, index);

      let payload;
      try {
        payload = await findFaces(
          frameFile,
          useEmbeddings ? "calculator" : "",
          true,
        );
      } catch (error) {
        if (!useEmbeddings) throw error;
        useEmbeddings = false;
        payload = await findFaces(frameFile, "", true);
      }

      const detectedFaces = Array.isArray(payload.result) ? payload.result : [];
      const faces = detectedFaces.map(addBestTargetMatch);
      nextTrackId = assignFaceTracks(
        faces,
        tracks,
        timestamp,
        sampleInterval,
        nextTrackId,
      );
      samples.push({ timestamp, faces });
    }

    if (generation !== processingGeneration) return;

    const { confirmedTracks, playbackSamples, discardedTracks } =
      createConfirmedVideoAnalysis(samples, tracks);
    await waitForVideoMetadata(node.video);
    node.video.controls = true;
    node.video.currentTime = 0;
    installVideoOverlayPlayback(
      node.video,
      node.videoOverlay,
      playbackSamples,
      sampleInterval,
    );
    node.summary.classList.remove("error");
    node.summary.textContent = createVideoSummary(
      playbackSamples,
      confirmedTracks,
      sampleInterval,
      requestedInterval,
    );
    node.raw.textContent = JSON.stringify(
      createVideoDiagnostics(
        file,
        duration,
        playbackSamples,
        confirmedTracks,
        sampleInterval,
        discardedTracks,
      ),
      null,
      2,
    );
  } catch (error) {
    node.video.controls = true;
    node.summary.classList.add("error");
    node.summary.textContent = error.message;
    node.raw.textContent = "";
  } finally {
    decoder.pause();
    decoder.removeAttribute("src");
    decoder.load();
  }
}

function waitForVideoMetadata(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not read video"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
  });
}

function waitForVideoData(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not decode video"));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("error", onError);
  });
}

function seekVideo(video, timestamp) {
  if (Math.abs(video.currentTime - timestamp) < 0.001 && video.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out reading video at ${formatTime(timestamp)}`));
    }, 15000);
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Could not read video at ${formatTime(timestamp)}`));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = timestamp;
  });
}

function sizeFrameCanvas(canvas, width, height) {
  const scale = Math.min(1, VIDEO_MAX_SIDE / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
}

function captureVideoFrame(video, canvas) {
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

function canvasToFile(canvas, videoName, frameIndex) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not encode a video frame"));
        return;
      }
      const baseName = videoName.replace(/\.[^.]+$/, "") || "video";
      resolve(new File([blob], `${baseName}-frame-${frameIndex + 1}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  });
}

function createSampleTimestamps(duration, interval) {
  const count = Math.min(VIDEO_MAX_FRAMES, Math.max(1, Math.ceil(duration / interval)));
  return Array.from({ length: count }, (_, index) => Math.min(index * interval, duration - 0.001));
}

async function handleTargetFiles(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  for (const file of files) {
    await addTargetFaceFile(file);
  }
  targetFileInput.value = "";
}

async function addTargetFaceFile(file) {
  const image = await loadImage(file);
  const data = new FormData();
  data.append("file", file, file.name);
  const baseName = targetNameInput.value.trim() || getDefaultTargetName(file.name);

  try {
    const url = `/api/find_faces?face_plugins=calculator&limit=0&det_prob_threshold=${TARGET_DETECTION_THRESHOLD}`;
    const response = await fetch(url, { method: "POST", body: data });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    const faces = Array.isArray(payload.result) ? payload.result : [];
    const entries = faces
      .map((face, index) => createFaceEntry(file, image, face, index, getEntryName(baseName, index, faces.length)))
      .filter((entry) => Array.isArray(entry?.embedding));

    targetFaces.unshift(...entries);
    renderTargetFaces();
  } catch (error) {
    const fallback = createFallbackTarget(file, image, baseName, error.message);
    targetFaces.unshift(fallback);
    renderTargetFaces();
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read image"));
    image.src = URL.createObjectURL(file);
  });
}

function createFaceEntry(file, image, face, index, name) {
  const box = normalizeBox(face.box, image.naturalWidth, image.naturalHeight);
  if (!box) return null;

  const preview = createFacePreview(image, box);
  const probability = Number(face.box?.probability || 0);
  const embedding = Array.isArray(face.embedding) ? face.embedding : null;

  return {
    id: `${Date.now()}-${file.name}-${index}`,
    index: index + 1,
    name,
    source: file.name,
    probability,
    width: Math.round(box.width),
    height: Math.round(box.height),
    preview,
    embedding,
    status: embedding ? "Ready" : "No embedding",
  };
}

function createFallbackTarget(file, image, name, message) {
  return {
    id: `${Date.now()}-${file.name}-fallback`,
    index: 1,
    name,
    source: file.name,
    probability: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
    preview: image.src,
    embedding: null,
    status: message || "No face found",
  };
}

function getDefaultTargetName(fileName) {
  return fileName.replace(/\.[^.]+$/, "") || "Target";
}

function getEntryName(baseName, index, total) {
  return total > 1 ? `${baseName} ${index + 1}` : baseName;
}

function normalizeBox(box = {}, imageWidth, imageHeight) {
  const xMin = clamp(Number(box.x_min || 0), 0, imageWidth);
  const yMin = clamp(Number(box.y_min || 0), 0, imageHeight);
  const xMax = clamp(Number(box.x_max || 0), xMin, imageWidth);
  const yMax = clamp(Number(box.y_max || 0), yMin, imageHeight);
  const width = xMax - xMin;
  const height = yMax - yMin;

  if (width < 1 || height < 1) return null;
  return { xMin, yMin, width, height };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createFacePreview(image, box) {
  const canvas = document.createElement("canvas");
  const maxSide = 260;
  const scale = Math.min(1, maxSide / Math.max(box.width, box.height));
  const width = Math.max(1, Math.round(box.width * scale));
  const height = Math.max(1, Math.round(box.height * scale));
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(
    image,
    box.xMin,
    box.yMin,
    box.width,
    box.height,
    0,
    0,
    width,
    height,
  );

  return canvas.toDataURL("image/jpeg", 0.88);
}

function renderTargetFaces() {
  facesGrid.replaceChildren();
  facesEmpty.hidden = targetFaces.length > 0;
  faceCount.textContent = `${targetFaces.length} target face${targetFaces.length === 1 ? "" : "s"}`;

  targetFaces.forEach((face, index) => {
    const fragment = faceTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".faceCard");
    const image = fragment.querySelector("img");
    const title = fragment.querySelector("h3");
    const dimensions = fragment.querySelector("p");
    const nameInput = fragment.querySelector(".faceName");
    const confidence = fragment.querySelector(".confidence");
    const source = fragment.querySelector(".source");

    image.src = face.preview;
    image.alt = `Target face ${face.index} from ${face.source}`;
    title.textContent = getTargetLabel(face, index);
    dimensions.textContent = `${face.width} x ${face.height}px`;
    nameInput.value = face.name || getDefaultTargetName(face.source);
    nameInput.addEventListener("input", () => {
      face.name = nameInput.value.trim() || getDefaultTargetName(face.source);
      saveTargetFaces();
    });
    confidence.textContent = face.embedding ? face.status : face.status || "n/a";
    source.textContent = face.source;
    article.dataset.faceId = face.id;
    facesGrid.append(article);
  });

  saveTargetFaces();
}

function loadStoredTargetFaces() {
  try {
    const stored = JSON.parse(localStorage.getItem(TARGET_STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((face) => face && face.id && face.preview) : [];
  } catch (error) {
    return [];
  }
}

function saveTargetFaces() {
  try {
    localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(targetFaces));
  } catch (error) {
    // If storage quota is full, keep the current in-memory targets.
  }
}

function addBestTargetMatch(face) {
  const embedding = Array.isArray(face.embedding) ? face.embedding : null;
  if (!embedding || targetFaces.length === 0) return face;

  const bestMatch = targetFaces
    .filter((target) => Array.isArray(target.embedding))
    .map((target) => {
      const distance = euclideanDistance(embedding, target.embedding);
      return {
        target,
        distance,
        similarity: distanceToSimilarity(distance),
      };
    })
    .sort((a, b) => a.distance - b.distance)[0];

  if (!bestMatch) return face;
  return {
    ...face,
    match: {
      ...bestMatch,
      isMatch: bestMatch.similarity >= MATCH_SIMILARITY_THRESHOLD,
    },
  };
}

function euclideanDistance(first, second) {
  if (first.length !== second.length) return Number.POSITIVE_INFINITY;
  const total = first.reduce((sum, value, index) => {
    const diff = Number(value) - Number(second[index]);
    return sum + diff * diff;
  }, 0);
  return Math.sqrt(total);
}

function distanceToSimilarity(distance) {
  const [firstCoef, secondCoef] = similarityCoefficients;
  return (Math.tanh((firstCoef - distance) * secondCoef) + 1) / 2;
}

function createDetectionSummary(faces) {
  const matchCount = faces.filter((face) => face.match?.isMatch).length;
  const faceText = `${faces.length} face${faces.length === 1 ? "" : "s"} detected`;
  if (targetFaces.length === 0) return faceText;
  return `${faceText}, ${matchCount} named`;
}

function addMatchDiagnostics(payload, faces) {
  const match_debug = faces.map((face, index) => {
    const match = face.match;
    return {
      face: index + 1,
      name: match?.target?.name || null,
      matched: Boolean(match?.isMatch),
      similarity: match ? Number(match.similarity.toFixed(4)) : null,
      distance: match && Number.isFinite(match.distance) ? Number(match.distance.toFixed(4)) : null,
    };
  });

  return { ...payload, match_debug };
}

function assignFaceTracks(faces, tracks, timestamp, sampleInterval, nextTrackId) {
  const maxGap = Math.max(3, sampleInterval * 4);
  const candidates = [];

  faces.forEach((face, faceIndex) => {
    tracks.forEach((track, trackIndex) => {
      if (timestamp - track.lastSeen > maxGap) return;
      const score = calculateTrackScore(face, track);
      if (score !== null) candidates.push({ faceIndex, trackIndex, score });
    });
  });

  candidates.sort((first, second) => second.score - first.score);
  const assignedFaces = new Set();
  const assignedTracks = new Set();

  candidates.forEach(({ faceIndex, trackIndex }) => {
    if (assignedFaces.has(faceIndex) || assignedTracks.has(trackIndex)) return;
    updateTrack(tracks[trackIndex], faces[faceIndex], timestamp);
    assignedFaces.add(faceIndex);
    assignedTracks.add(trackIndex);
  });

  faces.forEach((face, faceIndex) => {
    if (assignedFaces.has(faceIndex)) return;
    tracks.push(createTrack(nextTrackId, face, timestamp));
    nextTrackId += 1;
  });

  return nextTrackId;
}

function calculateTrackScore(face, track) {
  const faceTargetId = face.match?.isMatch ? face.match.target.id : null;
  const sameTarget = faceTargetId && track.targetId === faceTargetId;
  const overlap = boxIntersectionOverUnion(face.box, track.box);
  const embeddingSimilarity = getEmbeddingSimilarity(face.embedding, track.embedding);
  const embeddingMatches = embeddingSimilarity !== null
    && embeddingSimilarity >= TRACK_MIN_EMBEDDING_SIMILARITY;

  if (!sameTarget && !embeddingMatches && overlap < TRACK_MIN_IOU) return null;
  return (sameTarget ? 2 : 0) + overlap + (embeddingSimilarity || 0);
}

function createTrack(id, face, timestamp) {
  const track = {
    id,
    firstSeen: timestamp,
    lastSeen: timestamp,
    appearances: 0,
    maxConfidence: 0,
    name: null,
    targetId: null,
    box: null,
    embedding: null,
  };
  updateTrack(track, face, timestamp);
  return track;
}

function updateTrack(track, face, timestamp) {
  const probability = Number(face.box?.probability || 0);
  const match = face.match?.isMatch ? face.match : null;

  track.lastSeen = timestamp;
  track.appearances += 1;
  track.maxConfidence = Math.max(track.maxConfidence, probability);
  track.box = face.box;
  if (Array.isArray(face.embedding)) track.embedding = face.embedding;
  if (match) {
    track.name = match.target.name || getTargetLabel(match.target);
    track.targetId = match.target.id;
  }

  face.track = { id: track.id };
}

function getEmbeddingSimilarity(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) {
    return null;
  }

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  first.forEach((value, index) => {
    const firstValue = Number(value);
    const secondValue = Number(second[index]);
    dotProduct += firstValue * secondValue;
    firstMagnitude += firstValue * firstValue;
    secondMagnitude += secondValue * secondValue;
  });

  const denominator = Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude);
  return denominator > 0 ? dotProduct / denominator : null;
}

function boxIntersectionOverUnion(first = {}, second = {}) {
  const xMin = Math.max(Number(first.x_min || 0), Number(second.x_min || 0));
  const yMin = Math.max(Number(first.y_min || 0), Number(second.y_min || 0));
  const xMax = Math.min(Number(first.x_max || 0), Number(second.x_max || 0));
  const yMax = Math.min(Number(first.y_max || 0), Number(second.y_max || 0));
  const intersection = Math.max(0, xMax - xMin) * Math.max(0, yMax - yMin);
  const firstArea = Math.max(0, Number(first.x_max || 0) - Number(first.x_min || 0))
    * Math.max(0, Number(first.y_max || 0) - Number(first.y_min || 0));
  const secondArea = Math.max(0, Number(second.x_max || 0) - Number(second.x_min || 0))
    * Math.max(0, Number(second.y_max || 0) - Number(second.y_min || 0));
  const union = firstArea + secondArea - intersection;
  return union > 0 ? intersection / union : 0;
}

function installVideoOverlayPlayback(video, overlay, samples, sampleInterval) {
  let scheduledFrame = null;
  let scheduledWithVideoCallback = false;

  const render = (timestamp = video.currentTime) => {
    const faces = interpolateVideoFaces(samples, timestamp, sampleInterval);
    drawVideoOverlay(overlay, faces);
  };

  const cancelScheduledFrame = () => {
    if (scheduledFrame === null) return;
    if (scheduledWithVideoCallback && "cancelVideoFrameCallback" in video) {
      video.cancelVideoFrameCallback(scheduledFrame);
    } else {
      window.cancelAnimationFrame(scheduledFrame);
    }
    scheduledFrame = null;
  };

  const scheduleNextFrame = () => {
    if (video.paused || video.ended || !video.isConnected) return;

    if ("requestVideoFrameCallback" in video) {
      scheduledWithVideoCallback = true;
      scheduledFrame = video.requestVideoFrameCallback((_now, metadata) => {
        scheduledFrame = null;
        render(metadata.mediaTime);
        scheduleNextFrame();
      });
    } else {
      scheduledWithVideoCallback = false;
      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = null;
        render();
        scheduleNextFrame();
      });
    }
  };

  const onPlay = () => {
    cancelScheduledFrame();
    scheduleNextFrame();
  };
  const onPause = () => {
    cancelScheduledFrame();
    render();
  };

  video.addEventListener("play", onPlay);
  video.addEventListener("pause", onPause);
  video.addEventListener("seeked", render);
  video.addEventListener("timeupdate", render);
  render();
}

function interpolateVideoFaces(samples, timestamp, sampleInterval) {
  if (samples.length === 0) return [];
  if (timestamp <= samples[0].timestamp) return samples[0].faces;
  if (timestamp >= samples.at(-1).timestamp) {
    return timestamp - samples.at(-1).timestamp <= sampleInterval * 1.5
      ? samples.at(-1).faces
      : [];
  }

  let low = 0;
  let high = samples.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].timestamp <= timestamp) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const previous = samples[low];
  const next = samples[high];
  const span = next.timestamp - previous.timestamp;
  const progress = span > 0 ? (timestamp - previous.timestamp) / span : 0;
  const nextByTrack = new Map(
    next.faces.map((face) => [face.track?.id, face]),
  );
  const previousTrackIds = new Set(
    previous.faces.map((face) => face.track?.id),
  );
  const interpolated = previous.faces.map((face) => {
    const nextFace = nextByTrack.get(face.track?.id);
    return nextFace
      ? interpolateTrackedFace(face, nextFace, progress)
      : { ...face, overlayAlpha: 1 - progress };
  });

  next.faces.forEach((face) => {
    if (!previousTrackIds.has(face.track?.id)) {
      interpolated.push({ ...face, overlayAlpha: progress });
    }
  });

  return interpolated;
}

function interpolateTrackedFace(previous, next, progress) {
  const previousBox = previous.box || {};
  const nextBox = next.box || {};
  const interpolate = (key) => {
    const start = Number(previousBox[key] || 0);
    return start + (Number(nextBox[key] || 0) - start) * progress;
  };

  return {
    ...previous,
    match: next.match || previous.match,
    track: next.track || previous.track,
    overlayAlpha: 1,
    box: {
      ...previousBox,
      x_min: interpolate("x_min"),
      y_min: interpolate("y_min"),
      x_max: interpolate("x_max"),
      y_max: interpolate("y_max"),
      probability: interpolate("probability"),
    },
  };
}

function createConfirmedVideoAnalysis(samples, tracks) {
  const minimumAppearances = samples.length > 1 ? 2 : 1;
  const confirmedTracks = tracks.filter(
    (track) => track.appearances >= minimumAppearances,
  );
  const confirmedIds = new Set(confirmedTracks.map((track) => track.id));
  const playbackSamples = samples.map((sample) => ({
    timestamp: sample.timestamp,
    faces: sample.faces.filter((face) => confirmedIds.has(face.track?.id)),
  }));

  return {
    confirmedTracks,
    playbackSamples,
    discardedTracks: tracks.length - confirmedTracks.length,
  };
}

function createVideoSummary(samples, tracks, sampleInterval, requestedInterval) {
  const detections = samples.reduce((total, sample) => total + sample.faces.length, 0);
  const namedTracks = tracks.filter((track) => track.name).length;
  const adjusted = sampleInterval > requestedInterval + 0.001
    ? ` · sampling adjusted to ${sampleInterval.toFixed(2)}s`
    : "";
  const named = namedTracks > 0 ? ` · ${namedTracks} named` : "";
  return `${tracks.length} face track${tracks.length === 1 ? "" : "s"} · ${detections} detections${named}${adjusted}`;
}

function createVideoDiagnostics(
  file,
  duration,
  samples,
  tracks,
  sampleInterval,
  discardedTracks,
) {
  return {
    file: file.name,
    duration_seconds: Number(duration.toFixed(3)),
    sample_interval_seconds: Number(sampleInterval.toFixed(3)),
    sampled_frames: samples.length,
    discarded_transient_tracks: discardedTracks,
    tracks: tracks.map((track) => ({
      id: track.id,
      name: track.name,
      first_seen_seconds: Number(track.firstSeen.toFixed(3)),
      last_seen_seconds: Number(track.lastSeen.toFixed(3)),
      appearances: track.appearances,
      max_confidence: Number(track.maxConfidence.toFixed(4)),
    })),
  };
}

function getVideoInterval() {
  const value = Number(videoInterval.value);
  return Number.isFinite(value) && value > 0 ? value : 0.5;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getApiThreshold() {
  const value = Number(threshold.value);
  return Math.min(0.99, Math.max(0.01, Number.isFinite(value) ? value : 0.8)).toFixed(2);
}

function updateResultCount() {
  const count = results.children.length;
  resultCount.textContent = `${count} detection result${count === 1 ? "" : "s"}`;
}

function drawImage(canvas, image, faces) {
  const maxWidth = 920;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);
  drawFaceBoxes(context, faces, scale);
}

function drawVideoOverlay(canvas, faces) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawFaceBoxes(context, faces, 1);
}

function drawFaceBoxes(context, faces, scale) {
  context.lineWidth = Math.max(2, Math.round(3 * scale));
  context.font = `${Math.max(12, Math.round(14 * scale))}px system-ui`;

  faces.forEach((face) => {
    const box = face.box || {};
    const x = Number(box.x_min || 0) * scale;
    const y = Number(box.y_min || 0) * scale;
    const w = (Number(box.x_max || 0) - Number(box.x_min || 0)) * scale;
    const h = (Number(box.y_max || 0) - Number(box.y_min || 0)) * scale;
    const match = face.match;
    const hasMatch = Boolean(match?.isMatch);
    const color = hasMatch ? "#13795b" : "#2563eb";
    const label = createBoxLabel(match, face.track);

    context.globalAlpha = clamp(Number(face.overlayAlpha ?? 1), 0, 1);
    context.strokeStyle = color;
    context.fillStyle = color;
    context.strokeRect(x, y, w, h);
    if (label) {
      const labelWidth = context.measureText(label).width + 10;
      context.fillRect(x, Math.max(0, y - 22), labelWidth, 22);
      context.fillStyle = "#ffffff";
      context.fillText(label, x + 5, Math.max(14, y - 7));
    }
  });
  context.globalAlpha = 1;
}

function createBoxLabel(match, track) {
  if (match?.isMatch) {
    return match.target.name || getTargetLabel(match.target);
  }
  return track?.id ? `Face ${track.id}` : "";
}

function getTargetLabel(target, fallbackIndex = targetFaces.indexOf(target)) {
  const index = fallbackIndex >= 0 ? fallbackIndex + 1 : target.index;
  return `Target ${index}`;
}

showPage(getPageFromHash(), false);
updateResultCount();
renderTargetFaces();
loadStatus();
checkBackend();
setInterval(checkBackend, 5000);
