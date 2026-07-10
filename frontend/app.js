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
const resultCount = document.querySelector("#resultCount");
const pageTabs = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll("[data-page]");
const facesGrid = document.querySelector("#facesGrid");
const facesEmpty = document.querySelector("#facesEmpty");
const faceCount = document.querySelector("#faceCount");
const scanFaceBtn = document.querySelector("#scanFaceBtn");
const cameraModal = document.querySelector("#cameraModal");
const cameraVideo = document.querySelector("#cameraVideo");
const cameraCancelBtn = document.querySelector("#cameraCancelBtn");
const cameraCaptureBtn = document.querySelector("#cameraCaptureBtn");
let cameraStream = null;

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

scanFaceBtn.addEventListener("click", openCameraModal);
cameraCancelBtn.addEventListener("click", closeCameraModal);
cameraCaptureBtn.addEventListener("click", async () => {
  const file = await captureCameraFile();
  closeCameraModal();
  if (file) await addTargetFaceFile(file);
});

async function openCameraModal() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 720 }, height: { ideal: 540 } },
      audio: false,
    });
    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    cameraModal.hidden = false;
  } catch (error) {
    window.alert("Could not access the camera. Please upload a photo instead.");
  }
}

function closeCameraModal() {
  if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
  cameraModal.hidden = true;
}

function captureCameraFile() {
  const canvas = document.createElement("canvas");
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  canvas.getContext("2d").drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}

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
    const color = hasMatch ? "#13795b" : "#2563eb";
    const label = createBoxLabel(index, probability, match);

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

showPage(getPageFromHash(), false);
updateResultCount();
renderTargetFaces();
loadStatus();
checkBackend();
setInterval(checkBackend, 5000);
