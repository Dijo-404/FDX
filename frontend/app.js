const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const targetFileInput = document.querySelector("#targetFileInput");
const targetDropzone = document.querySelector("#targetDropzone");
const targetNameInput = document.querySelector("#targetNameInput");
const results = document.querySelector("#results");
const template = document.querySelector("#resultTemplate");
const faceTemplate = document.querySelector("#faceTemplate");
const statusText = document.querySelector("#status");
const statusDot = document.querySelector("#statusDot");
const clearButton = document.querySelector("#clear");
const clearFacesButton = document.querySelector("#clearFaces");
const threshold = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#thresholdValue");
const resultCount = document.querySelector("#resultCount");
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
const scanCapture = document.querySelector("#scanCapture");
const scanStatusText = document.querySelector("#scanStatusText");
const scanThreshold = document.querySelector("#scanThreshold");
const scanThresholdValue = document.querySelector("#scanThresholdValue");
const liveDot = document.querySelector("#liveDot");
const liveTagText = document.querySelector("#liveTagText");

const MATCH_SIMILARITY_THRESHOLD = 0.8;
const TARGET_DETECTION_THRESHOLD = "0.55";
const TARGET_STORAGE_KEY = "fdx.targetFaces";
const targetFaces = loadStoredTargetFaces();
let similarityCoefficients = [0, 1];

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
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  for (const file of files) {
    const node = createResultNode(file);
    results.prepend(node.article);
    updateResultCount();
    await detectFile(file, node);
  }
}

function createResultNode(file) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector(".result");
  const title = fragment.querySelector("h2");
  const summary = fragment.querySelector(".summary");
  const canvas = fragment.querySelector("canvas");
  const raw = fragment.querySelector("pre");

  title.textContent = file.name;
  summary.textContent = "Queued";
  raw.textContent = "";

  return { article, summary, canvas, raw };
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

async function findFaces(file, facePlugins) {
  const data = new FormData();
  data.append("file", file, file.name);
  const url = `/api/find_faces?face_plugins=${encodeURIComponent(facePlugins)}&limit=0&det_prob_threshold=${getApiThreshold()}`;
  const response = await fetch(url, { method: "POST", body: data });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }

  return payload;
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

  context.lineWidth = Math.max(2, Math.round(3 * scale));
  context.font = `${Math.max(12, Math.round(14 * scale))}px system-ui`;

  faces.forEach((face, index) => {
    const box = face.box || {};
    const x = Number(box.x_min || 0) * scale;
    const y = Number(box.y_min || 0) * scale;
    const w = (Number(box.x_max || 0) - Number(box.x_min || 0)) * scale;
    const h = (Number(box.y_max || 0) - Number(box.y_min || 0)) * scale;
    const probability = Number(box.probability || 0);
    const match = face.match;
    const hasMatch = Boolean(match?.isMatch);
    const color = hasMatch ? "#ff2ea6" : "#39ff6a";
    const label = createBoxLabel(index, probability, match);

    context.strokeStyle = color;
    context.fillStyle = color;
    context.strokeRect(x, y, w, h);
    if (label) {
      const labelWidth = context.measureText(label).width + 10;
      context.fillRect(x, Math.max(0, y - 22), labelWidth, 22);
      context.fillStyle = "#05070a";
      context.fillText(label, x + 5, Math.max(14, y - 7));
    }
  });
}

function createBoxLabel(index, probability, match) {
  if (match?.isMatch) {
    return match.target.name || getTargetLabel(match.target);
  }
  return "";
}

function getTargetLabel(target, fallbackIndex = targetFaces.indexOf(target)) {
  const index = fallbackIndex >= 0 ? fallbackIndex + 1 : target.index;
  return `Target ${index}`;
}

/* --- Live scan (webcam) --- */

let scanStream = null;
let scanBusy = false;
let scanThree = null;

scanThreshold.addEventListener("input", () => {
  scanThresholdValue.value = Number(scanThreshold.value).toFixed(2);
});

scanToggle.addEventListener("click", () => {
  if (scanStream) {
    stopScanCamera();
  } else {
    startScanCamera();
  }
});

scanCapture.addEventListener("click", () => {
  runScan();
});

async function startScanCamera() {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 720 } },
      audio: false,
    });
    scanVideo.srcObject = scanStream;
    await scanVideo.play();

    scanIdle.hidden = true;
    scanHudCorners.hidden = false;
    scanCapture.disabled = false;
    scanToggle.textContent = "Stop camera";
    scanStatusText.textContent = "Camera live — targeting acquired";
    liveDot.classList.add("ready");
    liveTagText.textContent = "Camera live";

    getThree().start();
  } catch (error) {
    scanStatusText.textContent = `Camera unavailable: ${error.message}`;
  }
}

function stopScanCamera() {
  if (scanStream) {
    scanStream.getTracks().forEach((track) => track.stop());
  }
  scanStream = null;
  scanVideo.srcObject = null;

  scanIdle.hidden = false;
  scanHudCorners.hidden = true;
  scanCapture.disabled = true;
  scanToggle.textContent = "Start camera";
  scanStatusText.textContent = "Camera idle";
  liveDot.classList.remove("ready");
  liveTagText.textContent = "Offline";
  scanReadout.hidden = true;
  scanStage.classList.remove("scanning");
  clearScanOverlay();
  getThree().stop();
}

async function runScan() {
  if (!scanStream || scanBusy) return;
  scanBusy = true;
  scanCapture.disabled = true;
  scanStage.classList.add("scanning");
  scanReadout.hidden = false;
  scanReadoutLine1.textContent = "ANALYZING TARGET";
  scanReadoutLine2.textContent = "FACES: --";
  getThree().setIntensity(1);

  try {
    const blob = await captureScanFrame();
    const apiThreshold = Math.min(0.99, Math.max(0.01, Number(scanThreshold.value) || 0.8)).toFixed(2);
    const url = `/api/find_faces?face_plugins=calculator&limit=0&det_prob_threshold=${apiThreshold}`;
    const data = new FormData();
    data.append("file", blob, "scan.jpg");

    const response = await fetch(url, { method: "POST", body: data });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`);

    const faces = Array.isArray(payload.result) ? payload.result : [];
    const matchedFaces = faces.map(addBestTargetMatch);
    drawScanOverlay(matchedFaces);

    const matchCount = matchedFaces.filter((face) => face.match?.isMatch).length;
    scanReadoutLine1.textContent = faces.length ? "TARGET LOCKED" : "NO FACE DETECTED";
    scanReadoutLine2.textContent = `FACES: ${faces.length}${targetFaces.length ? ` / NAMED: ${matchCount}` : ""}`;
  } catch (error) {
    scanReadoutLine1.textContent = "SCAN FAILED";
    scanReadoutLine2.textContent = error.message;
    clearScanOverlay();
  } finally {
    scanBusy = false;
    scanCapture.disabled = false;
    scanStage.classList.remove("scanning");
    getThree().setIntensity(0.35);
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
    const x = Number(box.x_min || 0) * scale - offsetX;
    const y = Number(box.y_min || 0) * scale - offsetY;
    const w = (Number(box.x_max || 0) - Number(box.x_min || 0)) * scale;
    const h = (Number(box.y_max || 0) - Number(box.y_min || 0)) * scale;
    const hasMatch = Boolean(face.match?.isMatch);
    const color = hasMatch ? "#ff2ea6" : "#39ff6a";
    const label = hasMatch
      ? (face.match.target.name || getTargetLabel(face.match.target))
      : `${Math.round(Number(box.probability || 0) * 100)}%`;

    drawReticle(context, x, y, w, h, color);

    const labelWidth = context.measureText(label).width + 12;
    context.fillStyle = color;
    context.fillRect(x, Math.max(0, y - 22), labelWidth, 20);
    context.fillStyle = "#05070a";
    context.fillText(label, x + 6, Math.max(15, y - 7));
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
