const fileInput = document.querySelector("#fileInput");
const folderInput = document.querySelector("#folderInput");
const dropzone = document.querySelector("#dropzone");
const targetFileInput = document.querySelector("#targetFileInput");
const targetDropzone = document.querySelector("#targetDropzone");
const results = document.querySelector("#results");
const resultsEmpty = document.querySelector("#resultsEmpty");
const template = document.querySelector("#resultTemplate");
const faceTemplate = document.querySelector("#faceTemplate");
const statusText = document.querySelector("#status");
const statusDot = document.querySelector("#statusDot");
const clearButton = document.querySelector("#clear");
const clearFacesButton = document.querySelector("#clearFaces");
const resultCount = document.querySelector("#resultCount");
const batchProgress = document.querySelector("#batchProgress");
const matchesOnly = document.querySelector("#matchesOnly");
const pageTabs = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll("[data-page]");
const facesGrid = document.querySelector("#facesGrid");
const facesEmpty = document.querySelector("#facesEmpty");
const faceCount = document.querySelector("#faceCount");

const scanVideo = document.querySelector("#scanVideo");
const scanOverlay = document.querySelector("#scanOverlay");
const scanStage = document.querySelector("#scanStage");
const scanIdle = document.querySelector("#scanIdle");
const scanHudCorners = document.querySelector("#scanHudCorners");
const scanReadout = document.querySelector("#scanReadout");
const scanReadoutLine1 = document.querySelector("#scanReadoutLine1");
const scanReadoutLine2 = document.querySelector("#scanReadoutLine2");
const scanToggle = document.querySelector("#scanToggle");
const scanStatusText = document.querySelector("#scanStatusText");
const liveDot = document.querySelector("#liveDot");
const liveTagText = document.querySelector("#liveTagText");

const DEFAULT_DETECTION_THRESHOLD = "0.50";
const MATCH_SIMILARITY_THRESHOLD = 0.8;
const TARGET_DETECTION_THRESHOLD = "0.55";
const TARGET_STORAGE_KEY = "fdx.targetFaces";
const FACE_ATTRIBUTE_PLUGINS = "age,gender";
const FACE_MATCH_PLUGINS = `calculator,${FACE_ATTRIBUTE_PLUGINS}`;
const DEFAULT_DETECTION_FPS = 30;
const CAMERA_IDEAL_FPS = 60;
const VIDEO_FRAME_INTERVAL_SECONDS = 1 / DEFAULT_DETECTION_FPS;
const VIDEO_MAX_SIDE = 1280;
const TRACK_MIN_IOU = 0.12;
const TRACK_MIN_EMBEDDING_SIMILARITY = 0.65;
const LIVE_SCAN_INTERVAL_MS = 1000 / DEFAULT_DETECTION_FPS;
const LIVE_TRACK_RETENTION_SECONDS = 8;
const targetFaces = loadStoredTargetFaces();
let similarityCoefficients = [0, 1];
let processingGeneration = 0;
let uploadInProgress = false;

pageTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showPage(tab.dataset.pageTarget);
  });
});

window.addEventListener("hashchange", () => {
  showPage(getPageFromHash(), false);
});

clearButton.addEventListener("click", () => {
  processingGeneration += 1;
  results.querySelectorAll("video").forEach((video) => {
    URL.revokeObjectURL(video.src);
  });
  results.replaceChildren();
  fileInput.value = "";
  folderInput.value = "";
  batchProgress.hidden = true;
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

folderInput.addEventListener("change", () => {
  handleFiles(folderInput.files);
});

matchesOnly.addEventListener("change", updateResultCount);

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
    statusDot.classList.add("ready");
  } catch (error) {
    statusText.textContent = "Detector backend is still starting";
    statusDot.classList.remove("ready");
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

const PAGE_NAMES = ["scan", "detection", "faces"];

function getPageFromHash() {
  const page = window.location.hash.replace("#", "");
  return PAGE_NAMES.includes(page) ? page : "scan";
}

function showPage(pageName, updateHash = true) {
  const normalizedPage = PAGE_NAMES.includes(pageName) ? pageName : "scan";

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

  if (normalizedPage === "scan" && !scanStream) {
    void startScanCamera();
  } else if (normalizedPage !== "scan" && scanStream) {
    stopScanCamera();
  }
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(
    (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
  );
  fileInput.value = "";
  folderInput.value = "";
  if (files.length === 0 || uploadInProgress) return;

  const generation = processingGeneration;
  const nodes = files.map((file) => ({ file, node: createResultNode(file) }));
  const fragment = document.createDocumentFragment();
  nodes.forEach(({ node }) => fragment.append(node.article));
  results.prepend(fragment);
  uploadInProgress = true;
  fileInput.disabled = true;
  folderInput.disabled = true;
  dropzone.classList.add("processing");
  batchProgress.hidden = false;
  batchProgress.textContent = `Processing 0 of ${files.length}`;
  updateResultCount();

  try {
    for (let index = 0; index < nodes.length; index += 1) {
      if (generation !== processingGeneration) break;
      const { file, node } = nodes[index];
      setResultState(node, "processing");
      const state = file.type.startsWith("video/")
        ? await detectVideo(file, node, generation)
        : await detectFile(file, node);

      if (generation !== processingGeneration) break;
      setResultState(node, state);
      batchProgress.textContent = `Processing ${index + 1} of ${files.length}`;
    }
  } finally {
    uploadInProgress = false;
    fileInput.disabled = false;
    folderInput.disabled = false;
    dropzone.classList.remove("processing");
    if (generation === processingGeneration) {
      batchProgress.textContent = `${files.length} file${files.length === 1 ? "" : "s"} processed`;
      updateResultCount();
    }
  }
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

  title.textContent = file.webkitRelativePath || file.name;
  summary.textContent = "Queued";
  raw.textContent = "";
  article.dataset.resultState = "queued";
  article.dataset.kind = file.type.startsWith("video/") ? "video" : "image";

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
  let image;
  try {
    image = await loadImage(file);
  } catch (error) {
    node.summary.classList.add("error");
    node.summary.textContent = error.message;
    node.raw.textContent = "";
    return "error";
  }
  drawImage(node.canvas, image, []);

  try {
    const needsMatching = targetFaces.some((target) => Array.isArray(target.embedding));
    const payload = needsMatching
      ? await findFaces(file, FACE_MATCH_PLUGINS, true)
      : await findFaces(file, FACE_ATTRIBUTE_PLUGINS, true);

    const faces = Array.isArray(payload.result) ? payload.result : [];
    const matchedFaces = faces.map(addBestTargetMatch);
    drawImage(node.canvas, image, matchedFaces);
    node.summary.classList.remove("error");
    node.summary.textContent = createDetectionSummary(matchedFaces);
    node.raw.textContent = JSON.stringify(addMatchDiagnostics(payload, matchedFaces), null, 2);
    return needsMatching && matchedFaces.some((face) => face.match?.isMatch)
      ? "match"
      : needsMatching ? "no-match" : "detected";
  } catch (error) {
    if (hasSearchableTargets()) {
      try {
        const payload = await findFaces(file, FACE_ATTRIBUTE_PLUGINS, true);
        const faces = Array.isArray(payload.result) ? payload.result : [];
        drawImage(node.canvas, image, faces);
        node.summary.classList.add("error");
        node.summary.textContent = `${createDetectionSummary(faces)} · target matching unavailable`;
        node.raw.textContent = JSON.stringify(payload, null, 2);
        return "error";
      } catch (fallbackError) {
        node.summary.classList.add("error");
        node.summary.textContent = fallbackError.message;
        node.raw.textContent = "";
        return "error";
      }
    }

    node.summary.classList.add("error");
    node.summary.textContent = error.message;
    node.raw.textContent = "";
    return "error";
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
    const sampleInterval = VIDEO_FRAME_INTERVAL_SECONDS;
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
      if (generation !== processingGeneration) return "cancelled";

      const timestamp = timestamps[index];
      node.summary.textContent = `Analyzing frame ${index + 1} of ${timestamps.length} · ${formatTime(timestamp)}`;
      await seekVideo(decoder, timestamp);
      captureVideoFrame(decoder, frameCanvas);
      const frameFile = await canvasToFile(frameCanvas, file.name, index);

      let payload;
      try {
        payload = await findFaces(
          frameFile,
          useEmbeddings ? FACE_MATCH_PLUGINS : FACE_ATTRIBUTE_PLUGINS,
          true,
        );
      } catch (error) {
        if (!useEmbeddings) throw error;
        useEmbeddings = false;
        payload = await findFaces(frameFile, FACE_ATTRIBUTE_PLUGINS, true);
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
    return confirmedTracks.some((track) => track.targetId)
      ? "match"
      : hasSearchableTargets() ? "no-match" : "detected";
  } catch (error) {
    node.video.controls = true;
    node.summary.classList.add("error");
    node.summary.textContent = error.message;
    node.raw.textContent = "";
    return "error";
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
  const count = Math.max(1, Math.ceil(duration / interval));
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
  const baseName = getDefaultTargetName(file.name);

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
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    image.src = objectUrl;
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
  const fullImageBox = {
    xMin: 0,
    yMin: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
  return {
    id: `${Date.now()}-${file.name}-fallback`,
    index: 1,
    name,
    source: file.name,
    probability: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
    preview: createFacePreview(image, fullImageBox),
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
  const hasTargets = targetFaces.length > 0;
  facesEmpty.hidden = hasTargets;
  facesGrid.hidden = !hasTargets;
  clearFacesButton.disabled = !hasTargets;
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
  syncMatchFilter();
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
  if (!hasSearchableTargets()) return faceText;
  return `${faceText} · ${matchCount} target match${matchCount === 1 ? "" : "es"}`;
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
    age: next.age || previous.age,
    gender: next.gender || previous.gender,
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

function createVideoSummary(samples, tracks, sampleInterval) {
  const detections = samples.reduce((total, sample) => total + sample.faces.length, 0);
  const namedTracks = tracks.filter((track) => track.name).length;
  const fps = formatFps(1 / sampleInterval);
  const named = namedTracks > 0 ? ` · ${namedTracks} named` : "";
  return `${tracks.length} face track${tracks.length === 1 ? "" : "s"} · ${detections} detections · ${fps} fps${named}`;
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
    detection_fps: Number((1 / sampleInterval).toFixed(2)),
    analyzed_frames: samples.length,
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

function formatFps(fps) {
  return Number.isInteger(fps) ? String(fps) : fps.toFixed(2);
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getApiThreshold() {
  return DEFAULT_DETECTION_THRESHOLD;
}

function hasSearchableTargets() {
  return targetFaces.some((target) => Array.isArray(target.embedding));
}

function syncMatchFilter() {
  const canMatch = hasSearchableTargets();
  const wasDisabled = matchesOnly.disabled;
  matchesOnly.disabled = !canMatch;
  if (!canMatch) {
    matchesOnly.checked = false;
  } else if (wasDisabled) {
    matchesOnly.checked = true;
  }
  updateResultCount();
}

function setResultState(node, state) {
  node.article.dataset.resultState = state;
  node.article.classList.toggle("targetMatch", state === "match");
  updateResultCount();
}

function updateResultCount() {
  const items = Array.from(results.querySelectorAll(".result"));
  const filterMatches = matchesOnly.checked && hasSearchableTargets();
  let matchCount = 0;
  let completedCount = 0;
  let pendingCount = 0;

  items.forEach((item) => {
    const state = item.dataset.resultState;
    const isMatch = state === "match";
    const isPending = state === "queued" || state === "processing";
    const hideAsNonMatch = filterMatches && (state === "no-match" || state === "detected");
    item.hidden = hideAsNonMatch;
    if (isMatch) matchCount += 1;
    if (isPending) pendingCount += 1;
    else completedCount += 1;
  });

  if (filterMatches) {
    resultCount.textContent = `${matchCount} target match${matchCount === 1 ? "" : "es"} · ${completedCount} of ${items.length} processed`;
  } else {
    resultCount.textContent = `${items.length} detection result${items.length === 1 ? "" : "s"}`;
  }

  resultsEmpty.hidden = !(
    filterMatches
    && items.length > 0
    && pendingCount === 0
    && matchCount === 0
  );
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
    const color = hasMatch ? "#ff2ea6" : "#39ff6a";
    const label = createBoxLabel(face);

    context.globalAlpha = clamp(Number(face.overlayAlpha ?? 1), 0, 1);
    context.strokeStyle = color;
    context.fillStyle = color;
    context.strokeRect(x, y, w, h);
    if (label) {
      drawCanvasLabel(context, label, x, y, color);
    }
  });
  context.globalAlpha = 1;
}

function createBoxLabel(face, options = {}) {
  const { includeConfidence = false } = options;
  const match = face.match;
  const parts = [];

  if (match?.isMatch) {
    parts.push(match.target.name || getTargetLabel(match.target));
  } else if (face.track?.id) {
    parts.push(`Face ${face.track.id}`);
  }

  parts.push(...formatFaceAttributes(face));

  if (includeConfidence) {
    parts.push(`${Math.round(Number(face.box?.probability || 0) * 100)}%`);
  }

  return parts.filter(Boolean).join(" · ");
}

function formatFaceAttributes(face) {
  return [formatGender(face.gender), formatAge(face.age)].filter(Boolean);
}

function formatGender(gender) {
  const value = typeof gender === "string" ? gender : gender?.value;
  if (!value) return "";
  const text = String(value).trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1).toLowerCase()}` : "";
}

function formatAge(age) {
  if (!age) return "";

  if (Array.isArray(age) && age.length >= 2) {
    return `Age ${Math.round(Number(age[0]))}-${Math.round(Number(age[1]))}`;
  }

  if (typeof age === "number") {
    return `Age ${Math.round(age)}`;
  }

  const low = Number(age.low);
  const high = Number(age.high);
  const hasLow = Number.isFinite(low);
  const hasHigh = Number.isFinite(high);
  if (hasLow && hasHigh) {
    const roundedLow = Math.round(low);
    const roundedHigh = Math.round(high);
    return roundedLow === roundedHigh ? `Age ${roundedLow}` : `Age ${roundedLow}-${roundedHigh}`;
  }
  if (hasLow) return `Age ${Math.round(low)}`;
  if (hasHigh) return `Age ${Math.round(high)}`;
  return "";
}

function drawCanvasLabel(context, label, x, y, color, height = 22) {
  const paddingX = 6;
  const canvasWidth = context.canvas.width;
  const naturalWidth = context.measureText(label).width + paddingX * 2;
  const labelWidth = Math.min(naturalWidth, canvasWidth);
  const labelX = clamp(x, 0, Math.max(0, canvasWidth - labelWidth));
  const labelY = Math.max(0, y - height);
  const text = truncateCanvasText(context, label, Math.max(0, labelWidth - paddingX * 2));

  context.fillStyle = color;
  context.fillRect(labelX, labelY, labelWidth, height);
  context.fillStyle = "#05070a";
  context.fillText(text, labelX + paddingX, Math.max(14, labelY + height - 7));
}

function truncateCanvasText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;

  const suffix = "...";
  let truncated = text;
  while (truncated.length > 0 && context.measureText(`${truncated}${suffix}`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated ? `${truncated}${suffix}` : suffix;
}

function getTargetLabel(target, fallbackIndex = targetFaces.indexOf(target)) {
  const index = fallbackIndex >= 0 ? fallbackIndex + 1 : target.index;
  return `Target ${index}`;
}

/* --- Live scan (webcam) --- */

let scanStream = null;
let scanThree = null;
let scanStartPromise = null;
let liveScanGeneration = 0;
let liveScanTimer = null;
let liveScanRequest = null;
let liveScanTracks = [];
let liveNextTrackId = 1;

scanToggle.addEventListener("click", () => {
  if (scanStream) {
    stopScanCamera();
  } else {
    void startScanCamera();
  }
});

async function startScanCamera() {
  if (scanStream?.active) return;
  if (scanStartPromise) return scanStartPromise;

  scanStartPromise = openScanCamera();
  try {
    await scanStartPromise;
  } finally {
    scanStartPromise = null;
  }
}

async function openScanCamera() {
  scanToggle.disabled = true;
  scanStatusText.textContent = "Requesting camera access";
  liveTagText.textContent = "Connecting";

  try {
    if (!window.isSecureContext) {
      throw new Error("Camera access requires HTTPS or localhost");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support camera access");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: CAMERA_IDEAL_FPS, max: CAMERA_IDEAL_FPS },
      },
      audio: false,
    });
    scanStream = stream;
    scanVideo.srcObject = stream;
    await scanVideo.play();

    const cameraName = stream.getVideoTracks()[0]?.label || "Default camera";
    scanStage.classList.add("cameraReady");
    scanIdle.hidden = true;
    scanHudCorners.hidden = false;
    scanToggle.textContent = "Stop camera";
    scanStatusText.textContent = `${cameraName} · scanning and tracking`;
    liveDot.classList.add("ready");
    liveTagText.textContent = "Scanning live";

    getThree().start();
    startLiveScanning();
  } catch (error) {
    releaseScanCamera();
    scanStage.classList.remove("cameraReady");
    scanIdle.hidden = false;
    scanIdle.querySelector("strong").textContent = "[ CAMERA ACCESS NEEDED ]";
    scanIdle.querySelector("p").textContent = getCameraErrorMessage(error);
    scanStatusText.textContent = "Camera unavailable";
    liveDot.classList.remove("ready");
    liveTagText.textContent = "Offline";
    scanToggle.textContent = "Retry camera";
  } finally {
    scanToggle.disabled = false;
  }
}

function stopScanCamera() {
  releaseScanCamera();

  scanStage.classList.remove("cameraReady");
  scanIdle.hidden = false;
  scanIdle.querySelector("strong").textContent = "[ CAMERA STOPPED ]";
  scanIdle.querySelector("p").textContent = "Select Start camera to reconnect the live feed.";
  scanHudCorners.hidden = true;
  scanToggle.textContent = "Start camera";
  scanStatusText.textContent = "Camera idle";
  liveDot.classList.remove("ready");
  liveTagText.textContent = "Offline";
  scanReadout.hidden = true;
  scanStage.classList.remove("scanning");
  clearScanOverlay();
  scanThree?.stop();
}

function releaseScanCamera() {
  stopLiveScanning();
  scanStream?.getTracks().forEach((track) => track.stop());
  scanStream = null;
  scanVideo.pause();
  scanVideo.srcObject = null;
}

function getCameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "Camera permission was blocked. Allow it in your browser settings, then select Retry camera.";
  }
  if (error?.name === "NotFoundError") {
    return "No camera was found on this device.";
  }
  if (error?.name === "NotReadableError") {
    return "The camera is already in use by another application.";
  }
  return error?.message || "Could not open the camera.";
}

function startLiveScanning() {
  stopLiveScanning();
  liveScanTracks = [];
  liveNextTrackId = 1;
  const generation = liveScanGeneration;

  scanStage.classList.add("scanning");
  scanReadout.hidden = false;
  scanReadoutLine1.textContent = "CONTINUOUS SCAN";
  scanReadoutLine2.textContent = "SEARCHING FOR FACES";
  getThree().setIntensity(0.7);
  void runLiveScanLoop(generation);
}

function stopLiveScanning() {
  liveScanGeneration += 1;
  if (liveScanTimer !== null) {
    window.clearTimeout(liveScanTimer);
    liveScanTimer = null;
  }
  liveScanRequest?.abort();
  liveScanRequest = null;
  scanStage.classList.remove("scanning");
}

async function runLiveScanLoop(generation) {
  if (generation !== liveScanGeneration || !scanStream?.active) return;
  const startedAt = performance.now();
  let request = null;

  try {
    const blob = await captureScanFrame();
    const url = `/api/find_faces?face_plugins=${encodeURIComponent(FACE_MATCH_PLUGINS)}&limit=0&det_prob_threshold=${DEFAULT_DETECTION_THRESHOLD}`;
    const data = new FormData();
    data.append("file", blob, "scan.jpg");

    request = new AbortController();
    liveScanRequest = request;
    const response = await fetch(url, {
      method: "POST",
      body: data,
      signal: request.signal,
    });
    const payload = await response.json();
    const noFaceFound = response.status === 400 && /no face/i.test(payload.message || "");
    if (!response.ok && !noFaceFound) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }
    if (generation !== liveScanGeneration) return;

    const faces = noFaceFound || !Array.isArray(payload.result) ? [] : payload.result;
    const matchedFaces = faces.map(addBestTargetMatch);
    const timestamp = performance.now() / 1000;
    liveScanTracks = liveScanTracks.filter(
      (track) => timestamp - track.lastSeen <= LIVE_TRACK_RETENTION_SECONDS,
    );
    liveNextTrackId = assignFaceTracks(
      matchedFaces,
      liveScanTracks,
      timestamp,
      LIVE_SCAN_INTERVAL_MS / 1000,
      liveNextTrackId,
    );
    drawScanOverlay(matchedFaces);

    const matchCount = matchedFaces.filter((face) => face.match?.isMatch).length;
    scanReadoutLine1.textContent = faces.length ? "TRACKING LIVE" : "CONTINUOUS SCAN";
    scanReadoutLine2.textContent = faces.length
      ? `FACES: ${faces.length}${targetFaces.length ? ` / NAMED: ${matchCount}` : ""}`
      : "NO FACE IN FRAME";
  } catch (error) {
    if (error?.name !== "AbortError" && generation === liveScanGeneration) {
      scanReadoutLine1.textContent = "DETECTOR RETRYING";
      scanReadoutLine2.textContent = error.message;
      clearScanOverlay();
    }
  } finally {
    if (liveScanRequest === request) {
      liveScanRequest = null;
    }
    if (generation === liveScanGeneration && scanStream?.active) {
      const elapsed = performance.now() - startedAt;
      const delay = Math.max(0, LIVE_SCAN_INTERVAL_MS - elapsed);
      liveScanTimer = window.setTimeout(() => {
        liveScanTimer = null;
        void runLiveScanLoop(generation);
      }, delay);
    }
  }
}

function captureScanFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = scanVideo.videoWidth;
  canvas.height = scanVideo.videoHeight;
  const context = canvas.getContext("2d");
  context.drawImage(scanVideo, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not read camera frame"));
    }, "image/jpeg", 0.9);
  });
}

function coverTransform(nativeWidth, nativeHeight, displayWidth, displayHeight) {
  const scale = Math.max(displayWidth / nativeWidth, displayHeight / nativeHeight);
  const offsetX = (nativeWidth * scale - displayWidth) / 2;
  const offsetY = (nativeHeight * scale - displayHeight) / 2;
  return { scale, offsetX, offsetY };
}

function drawScanOverlay(faces) {
  const displayWidth = scanStage.clientWidth;
  const displayHeight = scanStage.clientHeight;
  scanOverlay.width = displayWidth;
  scanOverlay.height = displayHeight;
  const context = scanOverlay.getContext("2d");
  context.clearRect(0, 0, displayWidth, displayHeight);

  if (!scanVideo.videoWidth || faces.length === 0) return;

  const { scale, offsetX, offsetY } = coverTransform(
    scanVideo.videoWidth,
    scanVideo.videoHeight,
    displayWidth,
    displayHeight,
  );

  context.lineWidth = 3;
  context.font = "bold 13px 'JetBrains Mono', monospace";

  faces.forEach((face) => {
    const box = face.box || {};
    const sourceXMax = Number(box.x_max || 0);
    const x = displayWidth - (sourceXMax * scale - offsetX);
    const y = Number(box.y_min || 0) * scale - offsetY;
    const w = (Number(box.x_max || 0) - Number(box.x_min || 0)) * scale;
    const h = (Number(box.y_max || 0) - Number(box.y_min || 0)) * scale;
    const hasMatch = Boolean(face.match?.isMatch);
    const color = hasMatch ? "#ff2ea6" : "#39ff6a";
    const label = createBoxLabel(face, { includeConfidence: true })
      || `Face ${face.track?.id || "?"} · ${Math.round(Number(box.probability || 0) * 100)}%`;

    drawReticle(context, x, y, w, h, color);

    drawCanvasLabel(context, label, x, y, color, 20);
  });
}

function drawReticle(context, x, y, w, h, color) {
  const tick = Math.min(18, w * 0.3, h * 0.3);
  context.strokeStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 8;

  const corners = [
    [x, y, tick, 0, 0, tick],
    [x + w, y, -tick, 0, 0, tick],
    [x, y + h, tick, 0, 0, -tick],
    [x + w, y + h, -tick, 0, 0, -tick],
  ];

  corners.forEach(([cx, cy, dx1, dy1, dx2, dy2]) => {
    context.beginPath();
    context.moveTo(cx + dx1, cy + dy1);
    context.lineTo(cx, cy);
    context.lineTo(cx + dx2, cy + dy2);
    context.stroke();
  });

  context.shadowBlur = 0;
}

function clearScanOverlay() {
  const context = scanOverlay.getContext("2d");
  context.clearRect(0, 0, scanOverlay.width, scanOverlay.height);
}

function getThree() {
  if (scanThree) return scanThree;
  scanThree = createScanVisualizer();
  return scanThree;
}

function createScanVisualizer() {
  if (typeof THREE === "undefined") {
    return { start() {}, stop() {}, setIntensity() {} };
  }

  const canvas = document.querySelector("#scanThree");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 6;

  const group = new THREE.Group();
  scene.add(group);

  const pointCount = 900;
  const positions = new Float32Array(pointCount * 3);
  for (let i = 0; i < pointCount; i += 1) {
    const phi = Math.acos(-1 + (2 * i) / pointCount);
    const theta = Math.sqrt(pointCount * Math.PI) * phi;
    const radius = 2.6;
    positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
    positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x39ff6a,
    size: 0.035,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  group.add(points);

  const ringGeometry = new THREE.RingGeometry(2.75, 2.8, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x39ff6a,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  group.add(ring);

  let running = false;
  let frameId = null;
  let intensity = 0.35;
  let lastSize = { width: 0, height: 0 };

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    if (width === lastSize.width && height === lastSize.height) return;
    lastSize = { width, height };
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function tick() {
    if (!running) return;
    resize();
    group.rotation.y += 0.0025 + intensity * 0.01;
    group.rotation.x = Math.sin(Date.now() * 0.0004) * 0.15;
    material.opacity = 0.2 + intensity * 0.35;
    ringMaterial.opacity = 0.12 + intensity * 0.25;
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      tick();
    },
    stop() {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
    },
    setIntensity(value) {
      intensity = value;
    },
  };
}

showPage(getPageFromHash(), false);
updateResultCount();
renderTargetFaces();
loadStatus();
checkBackend();
setInterval(checkBackend, 5000);
window.addEventListener("pagehide", releaseScanCamera);
