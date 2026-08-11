const folderInput = document.querySelector("#folderInput");
const detectionUploadButton = document.querySelector("#detectionUploadButton");
const startDetectionButton = document.querySelector("#startDetectionButton");
const downloadSelectedButton = document.querySelector("#downloadSelectedButton");
const targetFileInput = document.querySelector("#targetFileInput");
const targetAddButton = document.querySelector("#targetAddButton");
const targetDropzone = document.querySelector("#targetDropzone");
const targetDrawPanel = document.querySelector("#targetDrawPanel");
const targetDrawCanvas = document.querySelector("#targetDrawCanvas");
const targetDrawStatus = document.querySelector("#targetDrawStatus");
const targetIdentityControl = document.querySelector("#targetIdentityControl");
const targetIdentitySelect = document.querySelector("#targetIdentitySelect");
const addTargetImageButton = document.querySelector("#addTargetImage");
const addDrawnTargetButton = document.querySelector("#addDrawnTarget");
const cancelDrawTargetButton = document.querySelector("#cancelDrawTarget");
const openFaceCaptureButton = document.querySelector("#openFaceCapture");
const faceCaptureBackdrop = document.querySelector("#faceCaptureBackdrop");
const faceCaptureShell = document.querySelector("#faceCaptureShell");
const faceCapturePanel = document.querySelector("#faceCapturePanel");
const faceCaptureVideo = document.querySelector("#faceCaptureVideo");
const faceCaptureIdle = document.querySelector("#faceCaptureIdle");
const faceCaptureStatus = document.querySelector("#faceCaptureStatus");
const captureFaceButton = document.querySelector("#captureFace");
const retakeFaceCaptureButton = document.querySelector("#retakeFaceCapture");
const results = document.querySelector("#results");
const resultsEmpty = document.querySelector("#resultsEmpty");
const template = document.querySelector("#resultTemplate");
const faceTemplate = document.querySelector("#faceTemplate");
const statusText = document.querySelector("#status");
const statusDot = document.querySelector("#statusDot");
const clearFacesButton = document.querySelector("#clearFaces");
const resultCount = document.querySelector("#resultCount");
const batchProgress = document.querySelector("#batchProgress");
const detectionProgress = document.querySelector("#detectionProgress");
const detectionProgressBar = document.querySelector("#detectionProgressBar");
const detectionProgressText = document.querySelector("#detectionProgressText");
const pageTabs = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll("[data-page]");
const facesGrid = document.querySelector("#facesGrid");
const facesEmpty = document.querySelector("#facesEmpty");
const faceCount = document.querySelector("#faceCount");
const resultImagePreviewBackdrop = document.querySelector("#resultImagePreviewBackdrop");
const resultImagePreviewShell = document.querySelector("#resultImagePreviewShell");
const resultImagePreviewCanvas = document.querySelector("#resultImagePreviewCanvas");
const closeResultImagePreviewButton = document.querySelector("#closeResultImagePreview");

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

const DEFAULT_DETECTION_THRESHOLD = "0.60";
const MATCH_COSINE_THRESHOLD = 0.60;
const LOW_QUALITY_MATCH_COSINE_THRESHOLD = 0.65;
const TARGET_DETECTION_THRESHOLD = "0.98";
const CROPPED_TARGET_DETECTION_THRESHOLD = "0.80";
const CANDIDATE_COSINE_THRESHOLD = 0.40;
const MATCH_COSINE_MARGIN = 0.10;
const LOW_QUALITY_MATCH_COSINE_MARGIN = 0.12;
const ENROLLMENT_CONSISTENCY_COSINE = 0.35;
const SOURCE_IDENTITY_BOOTSTRAP_COSINE = 0.68;
const SOURCE_IDENTITY_WEAK_BOOTSTRAP_COSINE = 0.59;
const SOURCE_IDENTITY_WEAK_CONSENSUS_COSINE = 0.68;
const SOURCE_IDENTITY_WEAK_MIN_INDEPENDENT_SAMPLES = 3;
const SOURCE_IDENTITY_BRIDGE_COSINE = 0.65;
const SOURCE_IDENTITY_SUPPORT_COSINE = 0.58;
const SOURCE_IDENTITY_MIN_FACE_SIZE_PX = 30;
const SOURCE_IDENTITY_TRACK_MIN_DETECTION_PROBABILITY = 0.70;
const SOURCE_IDENTITY_TRACK_MIN_COSINE = 0.10;
const SOURCE_IDENTITY_TRACK_MAX_CENTER_DISTANCE = 0.08;
const SOURCE_IDENTITY_TRACK_MAX_SIZE_RATIO = 1.35;
const SOURCE_IDENTITY_TRACK_MIN_INDEPENDENT_SEEDS = 2;
const MIN_MATCH_DETECTION_PROBABILITY = 0.80;
const MIN_MATCH_FACE_SIZE_PX = 40;
const MIN_CROPPED_TARGET_FACE_SIZE_PX = 30;
const GOOD_MATCH_FACE_SIZE_PX = 80;
const MIN_TARGET_SELECTION_SIZE_PX = 24;
const TARGET_CROP_PADDING = 0.30;
const DETECTION_FOLDER_STORAGE_KEY = "fdx.detectionFolder";
const DETECTION_FOLDER_DB_NAME = "fdx.detectionFolderHandles";
const DETECTION_FOLDER_STORE_NAME = "handles";
const DETECTION_FOLDER_HANDLE_KEY = "current";
const DETECTION_CACHE_DB_NAME = "fdx.detectionCache";
const DETECTION_CACHE_DB_VERSION = 2;
const DETECTION_CACHE_STORE_NAME = "analyses";
const DETECTION_CACHE_INDEX_NAME = "cachedAt";
const DETECTION_CACHE_VERSION = 7;
const DETECTION_CACHE_MAX_ENTRIES = 200;
const DETECTION_CACHE_FULL_HASH_MAX_BYTES = 8 * 1024 * 1024;
const DETECTION_CACHE_SAMPLE_BYTES = 64 * 1024;
const TARGET_STORAGE_KEY = "fdx.targetFaces.adafaceIr101Ms1mv2.v1";
const FACE_DETECTION_PLUGINS = "";
const FACE_MATCH_PLUGINS = "calculator";
const BACKEND_ACCURATE = "accurate";
const EXPECTED_DETECTOR_MODEL_VERSION = "insightface.FaceDetector@retinaface_r50_v1";
const EXPECTED_CALCULATOR_MODEL_VERSION = "adaface.Calculator@ir101-ms1mv2";
const DETECTION_MODEL_CACHE_SIGNATURE = [
  EXPECTED_DETECTOR_MODEL_VERSION,
  EXPECTED_CALCULATOR_MODEL_VERSION,
  "cosine-512",
].join("|");
const DEFAULT_DETECTION_FPS = 30;
const CAMERA_IDEAL_FPS = 60;
const VIDEO_FRAME_INTERVAL_SECONDS = 1 / DEFAULT_DETECTION_FPS;
const VIDEO_MAX_SIDE = 1280;
const TRACK_MIN_IOU = 0.12;
const TRACK_MIN_EMBEDDING_SIMILARITY = 0.65;
const LIVE_SCAN_INTERVAL_MS = 1000 / DEFAULT_DETECTION_FPS;
const LIVE_TRACK_RETENTION_SECONDS = 8;
const LOCAL_PROXY_ORIGIN = "http://127.0.0.1:8080";
const LOCAL_PROXY_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const TONE_BLACK = "#050505";
const TONE_GRAY = "#777777";
const TONE_WHITE = "#f5f5f5";
const FACE_BOX_COLOR = TONE_GRAY;
const MATCH_BOX_COLOR = TONE_WHITE;
const LABEL_TEXT_COLOR = TONE_BLACK;
const SCAN_VISUALIZER_COLOR = 0xf5f5f5;
const detectorApiOrigin = getDetectorApiOrigin();
const targetFaces = loadStoredTargetFaces();
let detectionFolderMeta = loadStoredDetectionFolderMeta();
let currentDetectionSource = null;
let processingGeneration = 0;
let uploadInProgress = false;
let detectionUploadQueue = [];
let detectionUploadResultNodes = [];
let detectionUploadPromise = null;
let detectionUploadAbortController = null;
let detectionStopInProgress = false;
let detectionSourceRefreshPromise = null;
let detectionFolderRestorePromise = null;
let pendingDetectionSourceRefresh = false;
let detectionUploadProcessedCount = 0;
let detectionUploadTotalCount = 0;
let detectionUploadCacheHitCount = 0;
let detectionUploadInsertionAnchor = null;
let detectionUploadFaceSamples = [];
let detectionResultsHaveRun = false;
let selectedDownloadInProgress = false;
let zipCrc32Table = null;
let faceCaptureStream = null;
let faceCaptureStartPromise = null;
let faceCaptureAddInProgress = false;
let latestFaceCaptureIds = [];
let targetDrawState = null;
let resultImagePreviewOpener = null;
const detectionFileFingerprintPromises = new WeakMap();
const detectionMemoryCache = new Map();
let sourceIdentityExpansions = new Map();
let sourceIdentityExpansionSignature = "";
let detectionCacheDbPromise = null;
let detectorModelStatusPromise = null;

pageTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showPage(tab.dataset.pageTarget);
  });
});

window.addEventListener("hashchange", () => {
  showPage(getPageFromHash(), false);
});

clearFacesButton.addEventListener("click", () => {
  pendingDetectionSourceRefresh = false;
  clearSourceIdentityExpansions();
  const removedTargetIds = new Set(targetFaces.map((face) => face.id));
  targetFaces.splice(0, targetFaces.length);
  refreshCachedTargetMatches(removedTargetIds);
  renderTargetFaces();
});

folderInput.addEventListener("change", () => {
  void handleFolderInputSelection(folderInput.files);
});

detectionUploadButton.addEventListener("click", () => {
  void openDetectionFolderPicker();
});

startDetectionButton.addEventListener("click", () => {
  if (uploadInProgress) {
    void stopDetectionUpload();
    return;
  }
  void startDetectionFromCurrentSource();
});

downloadSelectedButton.addEventListener("click", () => {
  void downloadSelectedResults();
});

targetFileInput.addEventListener("change", () => {
  void handleTargetPickerSelection(targetFileInput.files);
});

targetAddButton.addEventListener("click", () => {
  if (targetFileInput.disabled) return;
  targetFileInput.value = "";
  targetFileInput.click();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeFaceCapturePopup();
    closeResultImagePreview();
    return;
  }

  if (!resultImagePreviewShell.hidden && event.key.startsWith("Arrow")) {
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    event.preventDefault();
    navigateResultImagePreview(direction);
  }
});

results.addEventListener("keydown", handleDetectionResultsKeydown);
facesGrid.addEventListener("keydown", handleTargetFacesKeydown);

resultImagePreviewBackdrop.addEventListener("click", closeResultImagePreview);
closeResultImagePreviewButton.addEventListener("click", closeResultImagePreview);

targetDrawCanvas.addEventListener("pointerdown", startTargetDrawSelection);
targetDrawCanvas.addEventListener("pointermove", updateTargetDrawSelection);
targetDrawCanvas.addEventListener("pointerup", finishTargetDrawSelection);
targetDrawCanvas.addEventListener("pointercancel", finishTargetDrawSelection);

addDrawnTargetButton.addEventListener("click", () => {
  void addDrawnTargetFace();
});

addTargetImageButton.addEventListener("click", () => {
  void addTargetImageFace();
});

cancelDrawTargetButton.addEventListener("click", () => {
  closeTargetDrawPanel();
});

openFaceCaptureButton.addEventListener("click", () => {
  void startFaceCaptureCamera();
});

faceCaptureBackdrop.addEventListener("click", () => {
  closeFaceCapturePopup();
});

captureFaceButton.addEventListener("click", () => {
  if (latestFaceCaptureIds.length > 0) {
    closeFaceCapturePopup();
    return;
  }
  void addCurrentFaceCapture();
});

retakeFaceCaptureButton.addEventListener("click", () => {
  retakeLatestFaceCapture();
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
    const { response, payload } = await fetchDetectorJson("/health");
    if (!response.ok || payload.ok !== true) throw new Error(`HTTP ${response.status}`);
    await ensureDetectorModelsReady();
    statusText.textContent = "Detector ready";
    statusDot.classList.add("ready");
  } catch (error) {
    statusText.textContent = error?.message || "Detector is starting";
    statusDot.classList.remove("ready");
  }
}

function ensureDetectorModelsReady() {
  if (!detectorModelStatusPromise) {
    detectorModelStatusPromise = fetchDetectorJson("/status")
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(`Detector status returned HTTP ${response.status}`);
        validateDetectorModelStatus(payload);
        return payload;
      })
      .catch((error) => {
        detectorModelStatusPromise = null;
        throw error;
      });
  }
  return detectorModelStatusPromise;
}

function validateDetectorModelStatus(payload) {
  const detectorVersion = payload?.available_plugins?.detector;
  const calculatorVersion = payload?.available_plugins?.calculator;
  const embeddingSize = Number(payload?.recognition?.embedding_size);
  const similarityMetric = String(payload?.similarity_metric || "").toLowerCase();

  if (detectorVersion !== EXPECTED_DETECTOR_MODEL_VERSION) {
    throw new Error(`Unexpected detector model: ${detectorVersion || "missing"}`);
  }
  if (calculatorVersion !== EXPECTED_CALCULATOR_MODEL_VERSION) {
    throw new Error(`Unexpected face model: ${calculatorVersion || "missing"}`);
  }
  if (embeddingSize !== 512 || similarityMetric !== "cosine") {
    throw new Error("Detector recognition configuration is incompatible");
  }
}

function validateDetectorResponseModels(payload, facePlugins) {
  const detectorVersion = payload?.plugins_versions?.detector;
  if (detectorVersion !== EXPECTED_DETECTOR_MODEL_VERSION) {
    throw new Error(`Detection response used an unexpected model: ${detectorVersion || "missing"}`);
  }

  if (
    facePlugins.split(",").includes(FACE_MATCH_PLUGINS)
    && payload?.plugins_versions?.calculator !== EXPECTED_CALCULATOR_MODEL_VERSION
  ) {
    throw new Error(
      `Embedding response used an unexpected model: ${
        payload?.plugins_versions?.calculator || "missing"
      }`,
    );
  }
}

function getDetectorApiOrigin() {
  const { protocol, hostname, port } = window.location;
  if ((protocol === "http:" || protocol === "https:") && port === "8080" && LOCAL_PROXY_HOSTS.has(hostname)) {
    return "";
  }
  return LOCAL_PROXY_ORIGIN;
}

function detectorApiUrl(path) {
  return `${detectorApiOrigin}${path}`;
}

function getDetectorConnectionMessage() {
  const target = detectorApiOrigin || window.location.origin;
  return `Detector proxy is not returning JSON at ${target}. Start with ./run.sh and open http://127.0.0.1:8080.`;
}

async function fetchDetectorJson(path, options = {}) {
  let response;
  try {
    response = await fetch(detectorApiUrl(path), options);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error(`${getDetectorConnectionMessage()} ${error?.message || ""}`.trim());
  }

  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!text) return { response, payload: {} };

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(createUnexpectedDetectorResponseMessage(response, text));
  }

  try {
    return { response, payload: JSON.parse(text) };
  } catch (error) {
    throw new Error(`Detector returned invalid JSON. ${getDetectorConnectionMessage()}`);
  }
}

function createUnexpectedDetectorResponseMessage(response, text) {
  const compactText = text.replace(/\s+/g, " ").trim();
  if (compactText.startsWith("<!DOCTYPE") || compactText.startsWith("<html") || compactText.includes("<body")) {
    return getDetectorConnectionMessage();
  }
  return `Detector returned HTTP ${response.status} without JSON. ${getDetectorConnectionMessage()}`;
}

const PAGE_NAMES = ["detection"];

function getPageFromHash() {
  const page = window.location.hash.replace("#", "");
  return PAGE_NAMES.includes(page) ? page : "detection";
}

function showPage(pageName, updateHash = true) {
  const normalizedPage = PAGE_NAMES.includes(pageName) ? pageName : "detection";

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

  if (normalizedPage !== "detection") {
    stopFaceCaptureCamera({ hidePanel: true });
    closeTargetDrawPanel();
  }

  if (normalizedPage === "scan" && !scanStream) {
    void startScanCamera();
  } else if (normalizedPage !== "scan" && scanStream) {
    stopScanCamera();
  }
}

function supportsDirectoryPicker() {
  return typeof window.showDirectoryPicker === "function";
}

function openDetectionSourcePicker() {
  return openDetectionFolderPicker();
}

async function openDetectionFolderPicker() {
  if (supportsDirectoryPicker()) {
    try {
      const handle = await window.showDirectoryPicker({
        id: "fdx-detection-folder",
        mode: "read",
      });
      try {
        await useDetectionDirectoryHandle(handle);
      } catch (error) {
        showDetectionFolderError(error);
      }
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  folderInput.click();
}

async function startDetectionFromCurrentSource() {
  if (uploadInProgress) return;

  if (!hasReusableDetectionSource()) {
    if (detectionFolderMeta?.path) {
      batchProgress.hidden = false;
      batchProgress.textContent = "Choose the source again to start detection";
    }
    await openDetectionSourcePicker();
    return;
  }

  batchProgress.hidden = false;
  batchProgress.textContent = detectionResultsHaveRun
    ? "Re-detecting selected source"
    : "Starting detection";

  try {
    const files = await getCurrentDetectionSourceFiles();
    if (files.length === 0) {
      batchProgress.textContent = "No supported photos or videos in selected folder";
      return;
    }

    await replaceDetectionResults(files);
  } catch (error) {
    showDetectionFolderError(error);
  }
}

async function handleFolderInputSelection(fileList) {
  const files = Array.from(fileList).filter(isFolderDetectionFile);
  if (files.length === 0) {
    folderInput.value = "";
    return;
  }

  saveDetectionFolderMeta({
    path: getFolderPathFromFiles(files),
    source: "input",
  });
  setCurrentDetectionSource({
    type: "folder-files",
    files,
    path: detectionFolderMeta.path,
    label: detectionFolderMeta.path,
  });
  void deleteStoredDetectionFolderHandle();
  await handleFiles(files);
}

async function useDetectionDirectoryHandle(handle, { autoRestore = false } = {}) {
  const path = handle.name || "Selected folder";
  saveDetectionFolderMeta({
    path,
    source: "directory-handle",
  });
  setCurrentDetectionSource({
    type: "directory-handle",
    handle,
    path,
    label: path,
  });

  if (autoRestore && (uploadInProgress || detectionResultsHaveRun)) return;

  const files = await readFilesFromDirectoryHandle(handle);
  await writeStoredDetectionFolderHandle(handle);

  if (files.length === 0) {
    batchProgress.hidden = false;
    batchProgress.textContent = "No supported photos or videos in selected folder";
    return;
  }

  await handleFiles(files);
}

async function restoreStoredDetectionFolderHandle() {
  renderDetectionFolderPath();
  const handle = await readStoredDetectionFolderHandle();
  if (!handle) return;

  const path = detectionFolderMeta?.path || handle.name || "Selected folder";
  setCurrentDetectionSource({
    type: "directory-handle",
    handle,
    path,
    label: path,
  });

  if (!detectionFolderMeta?.path) {
    saveDetectionFolderMeta({
      path,
      source: "directory-handle",
    });
  }

  const hasPermission = await hasDirectoryReadPermission(handle);
  if (hasPermission) {
    try {
      await useDetectionDirectoryHandle(handle, { autoRestore: true });
    } catch (error) {
      showDetectionFolderError(error);
    }
  }
}

async function hasDirectoryReadPermission(handle) {
  if (typeof handle?.queryPermission !== "function") return false;

  try {
    return await handle.queryPermission({ mode: "read" }) === "granted";
  } catch (error) {
    return false;
  }
}

async function ensureDirectoryReadPermission(handle) {
  if (!handle) return false;
  if (await hasDirectoryReadPermission(handle)) return true;
  if (typeof handle.requestPermission !== "function") return false;

  try {
    return await handle.requestPermission({ mode: "read" }) === "granted";
  } catch (error) {
    return false;
  }
}

async function readFilesFromDirectoryHandle(directoryHandle, basePath = directoryHandle.name) {
  const files = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    const relativePath = `${basePath}/${name}`;
    if (handle.kind === "directory") {
      files.push(...await readFilesFromDirectoryHandle(handle, relativePath));
    } else if (handle.kind === "file") {
      const file = await handle.getFile();
      if (isFolderDetectionFile(file)) {
        files.push(attachDetectionRelativePath(file, relativePath));
      }
    }
  }

  return files.sort((first, second) => getFileDisplayPath(first).localeCompare(getFileDisplayPath(second)));
}

function attachDetectionRelativePath(file, relativePath) {
  try {
    Object.defineProperty(file, "fdxRelativePath", {
      value: relativePath,
      configurable: true,
    });
  } catch (error) {
    file.fdxRelativePath = relativePath;
  }
  return file;
}

function isProcessableDetectionFile(file) {
  return file.type.startsWith("image/")
    || isVideoDetectionFile(file)
    || /\.(avif|bmp|gif|heic|heif|jpe?g|m4v|mov|mp4|png|webm|webp)$/i.test(file.name);
}

function isFolderDetectionFile(file) {
  return isProcessableDetectionFile(file);
}

function isVideoDetectionFile(file) {
  return file.type.startsWith("video/")
    || /\.(m4v|mov|mp4|webm)$/i.test(file.name);
}

function getFileDisplayPath(file) {
  return file.fdxRelativePath || file.webkitRelativePath || file.name;
}

function getFolderPathFromFiles(files) {
  const firstPath = files.find((file) => file.webkitRelativePath)?.webkitRelativePath;
  if (!firstPath) return "Selected folder";
  return firstPath.split("/").filter(Boolean)[0] || "Selected folder";
}

function showDetectionFolderError(error) {
  batchProgress.hidden = false;
  batchProgress.textContent = error?.message || "Could not open selected folder";
}

function setCurrentDetectionSource(source) {
  clearSourceIdentityExpansions();
  currentDetectionSource = source;
  renderDetectionFolderPath();
}

function saveDetectionFolderMeta(meta) {
  detectionFolderMeta = {
    path: meta.path || "Selected folder",
    source: meta.source || "input",
    savedAt: Date.now(),
  };
  localStorage.setItem(DETECTION_FOLDER_STORAGE_KEY, JSON.stringify(detectionFolderMeta));
  renderDetectionFolderPath();
}

function loadStoredDetectionFolderMeta() {
  try {
    const stored = JSON.parse(localStorage.getItem(DETECTION_FOLDER_STORAGE_KEY) || "null");
    if (stored && typeof stored.path === "string" && stored.path.trim()) {
      return {
        path: stored.path,
        source: stored.source || "input",
        savedAt: Number(stored.savedAt) || 0,
      };
    }
  } catch (error) {
    localStorage.removeItem(DETECTION_FOLDER_STORAGE_KEY);
  }
  return null;
}

function renderDetectionFolderPath() {
  const sourceLabel = currentDetectionSource?.label || detectionFolderMeta?.path;

  if (sourceLabel) {
    detectionUploadButton.textContent = `Folder: ${sourceLabel}`;
    detectionUploadButton.title = "Choose another media folder";
  } else {
    detectionUploadButton.textContent = "Choose media folder";
    detectionUploadButton.title = "Choose a folder containing photos and videos";
  }

  renderDetectionStartButton(sourceLabel);
}

function renderDetectionStartButton(sourceLabel = currentDetectionSource?.label || detectionFolderMeta?.path) {
  if (uploadInProgress) {
    startDetectionButton.hidden = false;
    startDetectionButton.disabled = detectionStopInProgress;
    startDetectionButton.classList.add("stopDetectionButton");
    startDetectionButton.textContent = detectionStopInProgress ? "Stopping..." : "Stop detection";
    startDetectionButton.title = detectionStopInProgress
      ? "Stopping detection"
      : "Stop the current detection run";
    return;
  }

  startDetectionButton.hidden = false;
  startDetectionButton.disabled = false;
  startDetectionButton.classList.remove("stopDetectionButton");
  startDetectionButton.textContent = detectionResultsHaveRun && hasReusableDetectionSource()
    ? "Re-detect"
    : "Start detection";
  startDetectionButton.title = sourceLabel
    ? "Start detection from the selected source"
    : "Choose a source, then start detection";
}

function openDetectionFolderDb() {
  if (!("indexedDB" in window)) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DETECTION_FOLDER_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DETECTION_FOLDER_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeStoredDetectionFolderHandle(handle) {
  const db = await openDetectionFolderDb().catch(() => null);
  if (!db) return;

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DETECTION_FOLDER_STORE_NAME, "readwrite");
    transaction.objectStore(DETECTION_FOLDER_STORE_NAME).put(handle, DETECTION_FOLDER_HANDLE_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  }).catch(() => {});
  db.close();
}

async function readStoredDetectionFolderHandle() {
  const db = await openDetectionFolderDb().catch(() => null);
  if (!db) return null;

  const handle = await new Promise((resolve, reject) => {
    const transaction = db.transaction(DETECTION_FOLDER_STORE_NAME, "readonly");
    const request = transaction.objectStore(DETECTION_FOLDER_STORE_NAME).get(DETECTION_FOLDER_HANDLE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).catch(() => null);
  db.close();
  return handle;
}

async function deleteStoredDetectionFolderHandle() {
  const db = await openDetectionFolderDb().catch(() => null);
  if (!db) return;

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DETECTION_FOLDER_STORE_NAME, "readwrite");
    transaction.objectStore(DETECTION_FOLDER_STORE_NAME).delete(DETECTION_FOLDER_HANDLE_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  }).catch(() => {});
  db.close();
}

function openDetectionCacheDb() {
  if (!("indexedDB" in window)) return Promise.resolve(null);
  if (detectionCacheDbPromise) return detectionCacheDbPromise;

  detectionCacheDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DETECTION_CACHE_DB_NAME, DETECTION_CACHE_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      const store = database.objectStoreNames.contains(DETECTION_CACHE_STORE_NAME)
        ? request.transaction.objectStore(DETECTION_CACHE_STORE_NAME)
        : database.createObjectStore(DETECTION_CACHE_STORE_NAME, { keyPath: "key" });
      if (event.oldVersion > 0 && event.oldVersion < DETECTION_CACHE_DB_VERSION) {
        store.clear();
      }
      if (!store.indexNames.contains(DETECTION_CACHE_INDEX_NAME)) {
        store.createIndex(DETECTION_CACHE_INDEX_NAME, "cachedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => null);

  return detectionCacheDbPromise;
}

async function readDetectionCacheEntry(key) {
  const memoryEntry = detectionMemoryCache.get(key);
  if (memoryEntry) return cloneDetectionCacheValue(memoryEntry);

  const db = await openDetectionCacheDb();
  if (!db) return null;

  const entry = await new Promise((resolve, reject) => {
    const transaction = db.transaction(DETECTION_CACHE_STORE_NAME, "readonly");
    const request = transaction.objectStore(DETECTION_CACHE_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).catch(() => null);

  if (!entry?.value) return null;
  rememberDetectionCacheEntry(key, entry.value);
  return cloneDetectionCacheValue(entry.value);
}

async function writeDetectionCacheEntry(key, value) {
  rememberDetectionCacheEntry(key, value);
  const db = await openDetectionCacheDb();
  if (!db) return;

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DETECTION_CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(DETECTION_CACHE_STORE_NAME).put({
      key,
      value,
      cachedAt: Date.now(),
    });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  }).catch(() => {});

  void pruneDetectionCache(db);
}

function rememberDetectionCacheEntry(key, value) {
  if (detectionMemoryCache.has(key)) detectionMemoryCache.delete(key);
  detectionMemoryCache.set(key, cloneDetectionCacheValue(value));

  while (detectionMemoryCache.size > DETECTION_CACHE_MAX_ENTRIES) {
    detectionMemoryCache.delete(detectionMemoryCache.keys().next().value);
  }
}

function cloneDetectionCacheValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function pruneDetectionCache(db) {
  const entryCount = await new Promise((resolve) => {
    const transaction = db.transaction(DETECTION_CACHE_STORE_NAME, "readonly");
    const request = transaction.objectStore(DETECTION_CACHE_STORE_NAME).count();
    request.onsuccess = () => resolve(request.result || 0);
    request.onerror = () => resolve(0);
  });
  let entriesToDelete = entryCount - DETECTION_CACHE_MAX_ENTRIES;
  if (entriesToDelete <= 0) return;

  await new Promise((resolve) => {
    const transaction = db.transaction(DETECTION_CACHE_STORE_NAME, "readwrite");
    const index = transaction.objectStore(DETECTION_CACHE_STORE_NAME).index(DETECTION_CACHE_INDEX_NAME);
    const request = index.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || entriesToDelete <= 0) return;
      cursor.delete();
      entriesToDelete -= 1;
      cursor.continue();
    };
    transaction.oncomplete = resolve;
    transaction.onerror = resolve;
  });
}

async function createDetectionCacheKey(file, kind, settings) {
  const fingerprint = await getDetectionFileFingerprint(file);
  return JSON.stringify({
    version: DETECTION_CACHE_VERSION,
    modelSignature: DETECTION_MODEL_CACHE_SIGNATURE,
    kind,
    fingerprint,
    settings,
  });
}

function getDetectionFileFingerprint(file) {
  let fingerprintPromise = detectionFileFingerprintPromises.get(file);
  if (!fingerprintPromise) {
    fingerprintPromise = calculateDetectionFileFingerprint(file);
    detectionFileFingerprintPromises.set(file, fingerprintPromise);
  }
  return fingerprintPromise;
}

async function calculateDetectionFileFingerprint(file) {
  const metadata = `${file.size}:${file.lastModified || 0}:${file.type || "unknown"}`;
  if (typeof crypto === "undefined" || !crypto.subtle || typeof file.arrayBuffer !== "function") {
    return `${metadata}:${getFileDisplayPath(file)}`;
  }

  try {
    const content = file.size <= DETECTION_CACHE_FULL_HASH_MAX_BYTES
      ? new Uint8Array(await file.arrayBuffer())
      : await readDetectionFileSamples(file);
    const metadataBytes = new TextEncoder().encode(metadata);
    const bytes = new Uint8Array(metadataBytes.length + content.length);
    bytes.set(metadataBytes);
    bytes.set(content, metadataBytes.length);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    return `${metadata}:${getFileDisplayPath(file)}`;
  }
}

async function readDetectionFileSamples(file) {
  const firstEnd = Math.min(file.size, DETECTION_CACHE_SAMPLE_BYTES);
  const middleStart = Math.max(
    firstEnd,
    Math.floor((file.size - DETECTION_CACHE_SAMPLE_BYTES) / 2),
  );
  const middleEnd = Math.min(file.size, middleStart + DETECTION_CACHE_SAMPLE_BYTES);
  const lastStart = Math.max(firstEnd, file.size - DETECTION_CACHE_SAMPLE_BYTES);
  const [first, middle, last] = await Promise.all([
    file.slice(0, firstEnd).arrayBuffer(),
    file.slice(middleStart, middleEnd).arrayBuffer(),
    file.slice(lastStart).arrayBuffer(),
  ]);
  const bytes = new Uint8Array(first.byteLength + middle.byteLength + last.byteLength);
  bytes.set(new Uint8Array(first));
  bytes.set(new Uint8Array(middle), first.byteLength);
  bytes.set(new Uint8Array(last), first.byteLength + middle.byteLength);
  return bytes;
}

function throwIfDetectionAborted(signal) {
  if (!signal?.aborted) return;
  throw new DOMException("Detection was cancelled", "AbortError");
}

async function findFacesWithSourceCache(file, kind, options, signal) {
  throwIfDetectionAborted(signal);
  await ensureDetectorModelsReady();
  throwIfDetectionAborted(signal);
  const cacheKey = await createDetectionCacheKey(file, kind, options);
  throwIfDetectionAborted(signal);
  const cached = await readDetectionCacheEntry(cacheKey);
  throwIfDetectionAborted(signal);

  if (
    cached?.kind === kind
    && cached.modelSignature === DETECTION_MODEL_CACHE_SIGNATURE
    && Array.isArray(cached.faces)
  ) {
    return { faces: cached.faces, cacheHit: true, cacheKey };
  }

  const payload = await findFaces(
    file,
    options.facePlugins,
    true,
    options.backend,
    options.threshold,
    signal,
    options.requestOptions || {},
  );
  const faces = Array.isArray(payload.result) ? payload.result : [];
  await writeDetectionCacheEntry(cacheKey, {
    kind,
    modelSignature: DETECTION_MODEL_CACHE_SIGNATURE,
    faces,
  });
  return { faces, cacheHit: false, cacheKey };
}

function collectDetectionSourceFaceSamples(file, cacheKey, faces, image) {
  const source = getFileDisplayPath(file);
  const sequence = getDetectionSourceSequence(source);
  const imageWidth = Math.max(1, Number(image?.naturalWidth) || 1);
  const imageHeight = Math.max(1, Number(image?.naturalHeight) || 1);

  faces.forEach((face, index) => {
    const embedding = normalizeEmbeddingVector(getFaceAccurateEmbedding(face));
    if (!embedding) return;

    const { quality } = getFaceMatchQuality(face);
    if (
      quality.width < SOURCE_IDENTITY_MIN_FACE_SIZE_PX
      || quality.height < SOURCE_IDENTITY_MIN_FACE_SIZE_PX
      || quality.detectionProbability < SOURCE_IDENTITY_TRACK_MIN_DETECTION_PROBABILITY
    ) {
      return;
    }

    const box = face?.box || {};
    const xMin = Number(box.x_min);
    const yMin = Number(box.y_min);
    const xMax = Number(box.x_max);
    const yMax = Number(box.y_max);
    const hasGeometry = [xMin, yMin, xMax, yMax].every(Number.isFinite)
      && xMax > xMin
      && yMax > yMin;

    detectionUploadFaceSamples.push({
      key: `${cacheKey}:${index}`,
      sourceKey: cacheKey,
      source,
      embedding,
      embeddingNorm: Number.isFinite(Number(face.embeddingNorm))
        ? Number(face.embeddingNorm)
        : null,
      detectionProbability: quality.detectionProbability,
      sequenceGroup: sequence?.group || null,
      sequenceIndex: sequence?.index ?? null,
      centerX: hasGeometry ? (xMin + xMax) / (2 * imageWidth) : null,
      centerY: hasGeometry ? (yMin + yMax) / (2 * imageHeight) : null,
      widthRatio: hasGeometry ? (xMax - xMin) / imageWidth : null,
      heightRatio: hasGeometry ? (yMax - yMin) / imageHeight : null,
    });
  });
}

function getDetectionSourceSequence(source) {
  const normalizedSource = String(source || "").replaceAll("\\", "/");
  const slashIndex = normalizedSource.lastIndexOf("/");
  const directory = slashIndex >= 0 ? normalizedSource.slice(0, slashIndex + 1) : "";
  const fileName = slashIndex >= 0 ? normalizedSource.slice(slashIndex + 1) : normalizedSource;
  const match = fileName.match(/^(.*?)(\d+)(\.[^.]+)$/);
  if (!match) return null;

  const index = Number(match[2]);
  if (!Number.isSafeInteger(index)) return null;
  return {
    group: `${directory}${match[1]}#${match[3].toLowerCase()}`,
    index,
  };
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(isProcessableDetectionFile);
  folderInput.value = "";
  if (files.length === 0) return detectionUploadPromise || Promise.resolve();

  if (!detectionUploadPromise && detectionUploadQueue.length === 0) {
    detectionUploadFaceSamples = [];
  }
  const generation = processingGeneration;
  const nodes = files.map((file) => ({ file, node: createResultNode(file) }));

  ensureDetectionUploadInsertionAnchor();
  detectionUploadResultNodes.push(...nodes.map(({ node }) => node));
  detectionUploadQueue.push(...nodes);
  detectionUploadTotalCount += nodes.length;
  updateDetectionProgress();

  if (!detectionUploadPromise) {
    detectionUploadPromise = processDetectionUploadQueue(generation);
  }

  return detectionUploadPromise;
}

async function processDetectionUploadQueue(generation) {
  uploadInProgress = true;
  const abortController = new AbortController();
  detectionUploadAbortController = abortController;
  renderDetectionStartButton();
  updateDetectionProgress();

  try {
    while (detectionUploadQueue.length > 0) {
      if (generation !== processingGeneration) break;
      const { file, node } = detectionUploadQueue.shift();
      setResultState(node, "processing");
      const state = isVideoDetectionFile(file)
        ? await detectVideo(file, node, generation, abortController.signal)
        : await detectFile(file, node, abortController.signal);

      if (generation !== processingGeneration) break;
      setResultState(node, state);
      const published = publishCompletedDetectionResult(node);
      if (node.cacheHit) detectionUploadCacheHitCount += 1;
      detectionUploadProcessedCount += 1;
      updateDetectionProgress();
      if (published) {
        await yieldToBrowser();
      }
    }
  } finally {
    const processedCount = detectionUploadProcessedCount;
    const totalCount = detectionUploadTotalCount;
    const cacheHitCount = detectionUploadCacheHitCount;
    const completedFaceSamples = detectionUploadFaceSamples;
    let visibleResultCount = 0;

    if (generation === processingGeneration) {
      const expandedIdentityUpdated = updateSourceIdentityExpansions(completedFaceSamples);
      if (expandedIdentityUpdated) {
        detectionProgressText.textContent = "Finalizing matches";
        await rescoreDetectionUploadResultsForSourceExpansion(
          detectionUploadResultNodes,
          generation,
        );
      }
      visibleResultCount = countPublishedDetectionResults(detectionUploadResultNodes);
      releaseUnpublishedDetectionResultNodes(detectionUploadResultNodes);
      detectionResultsHaveRun = true;
    } else {
      releaseUnpublishedDetectionResultNodes(detectionUploadResultNodes);
    }
    removeDetectionUploadInsertionAnchor();

    uploadInProgress = false;
    if (detectionUploadAbortController === abortController) {
      detectionUploadAbortController = null;
    }
    detectionUploadPromise = null;
    detectionUploadQueue = [];
    detectionUploadResultNodes = [];
    detectionUploadProcessedCount = 0;
    detectionUploadTotalCount = 0;
    detectionUploadCacheHitCount = 0;
    detectionUploadFaceSamples = [];
    hideDetectionProgress();
    renderDetectionStartButton();
    if (generation === processingGeneration) {
      batchProgress.textContent = createDetectionCompleteText(
        processedCount,
        totalCount,
        visibleResultCount,
        cacheHitCount,
      );
      updateResultCount();
    }
  }
}

function ensureDetectionUploadInsertionAnchor() {
  if (detectionUploadInsertionAnchor?.isConnected) return;
  detectionUploadInsertionAnchor = document.createComment("current detection results");
  results.insertBefore(detectionUploadInsertionAnchor, results.firstChild);
}

function removeDetectionUploadInsertionAnchor() {
  detectionUploadInsertionAnchor?.remove();
  detectionUploadInsertionAnchor = null;
}

function publishCompletedDetectionResult(node) {
  if (!shouldShowCompletedDetectionResult(node)) {
    deferUnpublishedDetectionResult(node);
    return false;
  }

  ensureDetectionUploadInsertionAnchor();
  results.insertBefore(node.article, detectionUploadInsertionAnchor);
  updateResultCount();
  return true;
}

function deferUnpublishedDetectionResult(node) {
  if (
    hasSearchableTargets()
    && node.article.dataset.resultState === "no-match"
  ) {
    if (node.imageAnalysis) {
      node.deferredImageFaces = node.imageAnalysis.faces.map(clearFaceTargetMatch);
    }

    if (node.videoAnalysis) {
      node.deferredVideoAnalysis = {
        ...node.videoAnalysis,
        overlayWidth: node.videoOverlay.width,
        overlayHeight: node.videoOverlay.height,
      };
    }
  }

  releaseDetectionResultNode(node);
}

async function rescoreDetectionUploadResultsForSourceExpansion(nodes, generation) {
  for (const node of nodes) {
    if (generation !== processingGeneration) return;

    if (node.imageAnalysis) {
      refreshImageTargetMatches(node);
      continue;
    }

    if (node.videoAnalysis) {
      refreshVideoTargetMatches(node);
      continue;
    }

    try {
      if (Array.isArray(node.deferredImageFaces)) {
        node.deferredImageFaces.forEach(refreshFaceTargetMatch);
        if (getResultStateForTargetMatches(node.deferredImageFaces) === "match") {
          await restoreDeferredImageResult(node);
        }
      } else if (node.deferredVideoAnalysis) {
        const { playbackSamples, confirmedTracks } = node.deferredVideoAnalysis;
        playbackSamples.forEach((sample) => {
          sample.faces.forEach(refreshFaceTargetMatch);
        });
        refreshTrackTargetLabels(confirmedTracks, playbackSamples);
        if (confirmedTracks.some((track) => track.targetId)) {
          await restoreDeferredVideoResult(node);
        }
      }
    } catch (error) {
      releaseDetectionResultNode(node);
    }
  }

  if (generation !== processingGeneration) return;
  ensureDetectionUploadInsertionAnchor();
  nodes.forEach((node) => {
    if (node.article.dataset.resultState !== "match") return;
    if (!node.imageAnalysis && !node.videoAnalysis) return;
    results.insertBefore(node.article, detectionUploadInsertionAnchor);
  });
  clearDeferredDetectionResultAnalyses(nodes);
  updateResultCount();
}

async function restoreDeferredImageResult(node) {
  const image = await loadImage(node.file);
  const faces = node.deferredImageFaces;
  const downloadUrl = URL.createObjectURL(node.file);

  node.released = false;
  node.downloadUrl = downloadUrl;
  node.downloadButton.href = downloadUrl;
  node.imageAnalysis = { image, faces };
  drawImage(node.canvas, image);
  node.summary.classList.remove("error");
  node.summary.textContent = `${createDetectionSummary(faces)}${node.cacheHit ? " · cached" : ""}`;
  setResultState(node, "match");
}

async function restoreDeferredVideoResult(node) {
  const {
    playbackSamples,
    confirmedTracks,
    sampleInterval,
    overlayWidth,
    overlayHeight,
  } = node.deferredVideoAnalysis;
  const objectUrl = URL.createObjectURL(node.file);

  node.released = false;
  node.video.src = objectUrl;
  node.videoOverlay.width = overlayWidth;
  node.videoOverlay.height = overlayHeight;
  const state = await installCompletedVideoAnalysis(
    node,
    playbackSamples,
    confirmedTracks,
    sampleInterval,
    node.cacheHit,
  );
  setResultState(node, state);
}

function clearDeferredDetectionResultAnalyses(nodes) {
  nodes.forEach((node) => {
    node.deferredImageFaces = null;
    node.deferredVideoAnalysis = null;
  });
}

function countPublishedDetectionResults(nodes) {
  return nodes.reduce((count, node) => count + Number(node.article.isConnected), 0);
}

function releaseUnpublishedDetectionResultNodes(nodes) {
  nodes.forEach((node) => {
    if (!node.article.isConnected) releaseDetectionResultNode(node);
  });
}

function shouldShowCompletedDetectionResult(node) {
  const state = node.article.dataset.resultState;
  if (state === "queued" || state === "processing" || state === "cancelled") return false;
  if (hasSearchableTargets()) return state === "match";
  return hasDetectedFaces(node);
}

function hasDetectedFaces(node) {
  if (node.imageAnalysis) {
    return node.imageAnalysis.faces.length > 0;
  }

  if (node.videoAnalysis) {
    return node.videoAnalysis.confirmedTracks.length > 0;
  }

  return false;
}

function releaseDetectionResultNode(node) {
  if (node.released) return;
  node.released = true;

  if (node.video?.src?.startsWith("blob:")) {
    URL.revokeObjectURL(node.video.src);
  }

  if (node.downloadUrl) {
    URL.revokeObjectURL(node.downloadUrl);
    node.downloadUrl = null;
  }

  if (node.video) {
    node.video.removeAttribute("src");
    node.video.load();
  }

  if (node.canvas) {
    node.canvas.width = 0;
    node.canvas.height = 0;
  }

  if (node.videoOverlay) {
    node.videoOverlay.width = 0;
    node.videoOverlay.height = 0;
  }

  node.imageAnalysis = null;
  node.videoAnalysis = null;
  node.renderVideoOverlay = null;
}

function createDetectionCompleteText(processedCount, totalCount, visibleResultCount, cacheHitCount) {
  const processedText = `${processedCount} of ${totalCount} file${totalCount === 1 ? "" : "s"} scanned`;
  const resultText = hasSearchableTargets()
    ? `${visibleResultCount} target match${visibleResultCount === 1 ? "" : "es"}`
    : `${visibleResultCount} with visible face${visibleResultCount === 1 ? "" : "s"}`;
  const cacheText = cacheHitCount > 0
    ? ` · ${cacheHitCount} from cache`
    : "";

  return `${processedText} · ${resultText}${cacheText}`;
}

function requestCurrentDetectionSourceRefresh() {
  if (!hasSearchableTargets()) return;

  pendingDetectionSourceRefresh = true;
  if (!detectionSourceRefreshPromise) {
    detectionSourceRefreshPromise = runPendingDetectionSourceRefresh()
      .finally(() => {
        detectionSourceRefreshPromise = null;
        if (pendingDetectionSourceRefresh) {
          requestCurrentDetectionSourceRefresh();
        }
      });
  }
}

async function runPendingDetectionSourceRefresh() {
  while (pendingDetectionSourceRefresh) {
    pendingDetectionSourceRefresh = false;
    await refreshCurrentDetectionSource();
  }
}

function hasReusableDetectionSource() {
  return Boolean(
    currentDetectionSource?.handle
    || currentDetectionSource?.files?.some(isProcessableDetectionFile),
  );
}

async function refreshCurrentDetectionSource() {
  if (!hasSearchableTargets()) return;

  if (!hasReusableDetectionSource() && detectionFolderRestorePromise) {
    await detectionFolderRestorePromise.catch(() => {});
  }

  if (!hasReusableDetectionSource()) {
    showMissingReusableDetectionSource();
    return;
  }

  batchProgress.hidden = false;
  batchProgress.textContent = "Re-detecting selected source";

  try {
    const files = await getCurrentDetectionSourceFiles();
    if (files.length === 0) {
      batchProgress.textContent = "No supported photos or videos in selected folder";
      return;
    }

    await replaceDetectionResults(files);
  } catch (error) {
    showDetectionFolderError(error);
  }
}

function showMissingReusableDetectionSource() {
  if (!detectionFolderMeta?.path) return;

  batchProgress.hidden = false;
  batchProgress.textContent = "Choose the source again to start detection";
  renderDetectionFolderPath();
}

async function getCurrentDetectionSourceFiles() {
  if (currentDetectionSource?.type === "directory-handle") {
    const hasPermission = await ensureDirectoryReadPermission(currentDetectionSource.handle);
    if (!hasPermission) {
      throw new Error("Allow folder access to detect from the same folder");
    }
    return readFilesFromDirectoryHandle(currentDetectionSource.handle);
  }

  return Array.from(currentDetectionSource?.files || []).filter(isProcessableDetectionFile);
}

async function replaceDetectionResults(files) {
  await cancelDetectionUpload();
  releaseDetectionResultMedia();
  results.replaceChildren();
  detectionResultsHaveRun = false;
  resultsEmpty.hidden = true;
  updateResultCount();
  await handleFiles(files);
}

function releaseDetectionResultMedia() {
  results.querySelectorAll(".result").forEach((article) => {
    if (article.fdxResultNode) {
      releaseDetectionResultNode(article.fdxResultNode);
      return;
    }

    const video = article.querySelector("video");
    if (video?.src?.startsWith("blob:")) URL.revokeObjectURL(video.src);
  });
}

async function cancelDetectionUpload() {
  processingGeneration += 1;
  detectionUploadQueue = [];
  detectionUploadAbortController?.abort();

  const activeUpload = detectionUploadPromise;
  if (activeUpload) {
    await activeUpload.catch(() => {});
  }

  uploadInProgress = false;
  detectionUploadPromise = null;
  detectionUploadQueue = [];
  releaseUnpublishedDetectionResultNodes(detectionUploadResultNodes);
  removeDetectionUploadInsertionAnchor();
  detectionUploadResultNodes = [];
  detectionUploadProcessedCount = 0;
  detectionUploadTotalCount = 0;
  detectionUploadCacheHitCount = 0;
  detectionResultsHaveRun = detectionResultsHaveRun || Boolean(results.querySelector(".result"));
  hideDetectionProgress();
  renderDetectionStartButton();
}

async function stopDetectionUpload() {
  if (!uploadInProgress || detectionStopInProgress) return;

  detectionStopInProgress = true;
  const processedCount = detectionUploadProcessedCount;
  const totalCount = detectionUploadTotalCount;
  renderDetectionStartButton();

  try {
    await cancelDetectionUpload();
    batchProgress.hidden = false;
    batchProgress.textContent = `Detection stopped · ${processedCount} of ${totalCount} file${totalCount === 1 ? "" : "s"} scanned`;
    updateResultCount();
  } finally {
    detectionStopInProgress = false;
    renderDetectionStartButton();
  }
}

function updateDetectionProgress() {
  const total = detectionUploadTotalCount;
  const processed = Math.min(detectionUploadProcessedCount, total);

  batchProgress.hidden = true;
  const visibleResultCount = results.querySelectorAll(".result:not([hidden])").length;
  const visibleResultLabel = hasSearchableTargets()
    ? `target match${visibleResultCount === 1 ? "" : "es"}`
    : `confirmed detection result${visibleResultCount === 1 ? "" : "s"}`;
  resultCount.textContent = visibleResultCount > 0
    ? `${visibleResultCount} ${visibleResultLabel} · processing`
    : "Detection in progress";
  detectionProgress.hidden = false;
  detectionProgressBar.max = total || 1;
  detectionProgressBar.value = processed;
  detectionProgressText.textContent = `${processed} of ${total} files processed`;
}

function hideDetectionProgress() {
  detectionProgress.hidden = true;
  detectionProgressBar.max = 1;
  detectionProgressBar.value = 0;
  detectionProgressText.textContent = "0 of 0 files processed";
}

function createResultNode(file) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector(".result");
  const title = fragment.querySelector("h2");
  const summary = fragment.querySelector(".summary");
  const imageStage = fragment.querySelector(".imageStage");
  const canvas = fragment.querySelector(".imageCanvas");
  const downloadButton = fragment.querySelector(".resultDownload");
  const selectionControl = fragment.querySelector(".resultSelect");
  const selectionCheckbox = fragment.querySelector(".resultSelectCheckbox");
  const videoStage = fragment.querySelector(".videoStage");
  const video = fragment.querySelector("video");
  const videoOverlay = fragment.querySelector(".videoOverlay");

  const displayPath = getFileDisplayPath(file);
  title.textContent = displayPath;
  summary.textContent = "Queued";
  article.dataset.resultState = "queued";
  article.dataset.kind = isVideoDetectionFile(file) ? "video" : "image";
  article.tabIndex = 0;
  article.setAttribute("aria-label", `Detection result for ${displayPath}`);
  article.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown");

  if (!isVideoDetectionFile(file)) {
    const downloadUrl = URL.createObjectURL(file);
    downloadButton.href = downloadUrl;
    downloadButton.download = getDownloadFileName(displayPath, file);
    downloadButton.hidden = false;
    downloadButton.setAttribute("aria-label", `Download ${displayPath}`);
    selectionCheckbox.setAttribute("aria-label", `Select ${displayPath} for bulk download`);
    selectionCheckbox.addEventListener("change", () => {
      article.classList.toggle("selectedForDownload", selectionCheckbox.checked);
      updateSelectedDownloadButton();
    });
    canvas.tabIndex = -1;
    canvas.setAttribute("role", "button");
    canvas.setAttribute("aria-label", `Open ${displayPath} image preview`);
    canvas.addEventListener("click", () => {
      openResultImagePreview(canvas, displayPath);
    });
    article.addEventListener("keydown", (event) => {
      if (event.target !== article) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openResultImagePreview(canvas, displayPath);
    });
  } else {
    selectionControl.hidden = true;
  }

  const node = {
    article,
    summary,
    imageStage,
    canvas,
    downloadButton,
    selectionCheckbox,
    videoStage,
    video,
    videoOverlay,
    imageAnalysis: null,
    videoAnalysis: null,
    renderVideoOverlay: null,
    deferredImageFaces: null,
    deferredVideoAnalysis: null,
    cacheHit: false,
    released: false,
    file,
    displayPath,
    downloadUrl: isVideoDetectionFile(file) ? null : downloadButton.href,
  };
  article.fdxResultNode = node;
  return node;
}

function getSelectedDownloadNodes() {
  return Array.from(results.querySelectorAll(".resultSelectCheckbox:checked"))
    .map((checkbox) => checkbox.closest(".result")?.fdxResultNode)
    .filter((node) => node?.downloadUrl && !node.released);
}

function updateSelectedDownloadButton() {
  if (selectedDownloadInProgress) {
    downloadSelectedButton.disabled = true;
    return;
  }

  const selectedCount = getSelectedDownloadNodes().length;
  downloadSelectedButton.disabled = selectedCount === 0;
  downloadSelectedButton.textContent = `Download selected (${selectedCount})`;
}

async function downloadSelectedResults() {
  const selectedNodes = getSelectedDownloadNodes();
  if (selectedNodes.length === 0) return;

  selectedDownloadInProgress = true;
  downloadSelectedButton.disabled = true;
  downloadSelectedButton.textContent = `Preparing 0 of ${selectedNodes.length}`;

  try {
    const archive = await createSelectedImagesZip(selectedNodes, (completed) => {
      downloadSelectedButton.textContent = `Preparing ${completed} of ${selectedNodes.length}`;
    });
    triggerBlobDownload(archive, createSelectedImagesZipName());
  } catch (error) {
    batchProgress.hidden = false;
    batchProgress.textContent = error?.message || "Could not prepare selected images";
  } finally {
    selectedDownloadInProgress = false;
    updateSelectedDownloadButton();
  }
}

async function createSelectedImagesZip(nodes, onProgress = () => {}) {
  const encoder = new TextEncoder();
  const names = createUniqueZipEntryNames(nodes);
  const entries = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const data = new Uint8Array(await node.file.arrayBuffer());
    if (data.byteLength > 0xffffffff) {
      throw new Error(`${names[index]} is too large for a ZIP download`);
    }
    const { dosDate, dosTime } = getZipDosDateTime(node.file.lastModified);
    entries.push({
      data,
      nameBytes: encoder.encode(names[index]),
      crc32: calculateZipCrc32(data),
      dosDate,
      dosTime,
    });
    onProgress(index + 1);
    await yieldToBrowser();
  }

  if (entries.length > 0xffff) {
    throw new Error("Too many images selected for one ZIP download");
  }

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  let centralSize = 0;

  entries.forEach((entry) => {
    const localHeader = createZipLocalHeader(entry);
    localParts.push(localHeader, entry.nameBytes, entry.data);

    const centralHeader = createZipCentralHeader(entry, localOffset);
    centralParts.push(centralHeader, entry.nameBytes);

    localOffset += localHeader.byteLength + entry.nameBytes.byteLength + entry.data.byteLength;
    centralSize += centralHeader.byteLength + entry.nameBytes.byteLength;
  });

  if (localOffset > 0xffffffff || centralSize > 0xffffffff) {
    throw new Error("Selected images are too large for one ZIP download");
  }

  const endRecord = createZipEndRecord(entries.length, centralSize, localOffset);
  return new Blob([...localParts, ...centralParts, endRecord], { type: "application/zip" });
}

function createUniqueZipEntryNames(nodes) {
  const usedNames = new Set();

  return nodes.map((node) => {
    const originalName = getDownloadFileName(node.displayPath, node.file).replace(/[\\/]/g, "_");
    const extensionIndex = originalName.lastIndexOf(".");
    const baseName = extensionIndex > 0 ? originalName.slice(0, extensionIndex) : originalName;
    const extension = extensionIndex > 0 ? originalName.slice(extensionIndex) : "";
    let candidate = originalName;
    let suffix = 2;

    while (usedNames.has(candidate.toLocaleLowerCase())) {
      candidate = `${baseName} (${suffix})${extension}`;
      suffix += 1;
    }
    usedNames.add(candidate.toLocaleLowerCase());
    return candidate;
  });
}

function getZipDosDateTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  return {
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function createZipLocalHeader(entry) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, entry.dosTime, true);
  view.setUint16(12, entry.dosDate, true);
  view.setUint32(14, entry.crc32, true);
  view.setUint32(18, entry.data.byteLength, true);
  view.setUint32(22, entry.data.byteLength, true);
  view.setUint16(26, entry.nameBytes.byteLength, true);
  return header;
}

function createZipCentralHeader(entry, localOffset) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, entry.dosTime, true);
  view.setUint16(14, entry.dosDate, true);
  view.setUint32(16, entry.crc32, true);
  view.setUint32(20, entry.data.byteLength, true);
  view.setUint32(24, entry.data.byteLength, true);
  view.setUint16(28, entry.nameBytes.byteLength, true);
  view.setUint32(42, localOffset, true);
  return header;
}

function createZipEndRecord(entryCount, centralSize, centralOffset) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return record;
}

function calculateZipCrc32(bytes) {
  if (!zipCrc32Table) {
    zipCrc32Table = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      return value >>> 0;
    });
  }

  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = zipCrc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function createSelectedImagesZipName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `fdx-selected-images-${timestamp}.zip`;
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getDownloadFileName(displayPath, file) {
  const sourceName = String(displayPath || file.name || "photo");
  const baseName = sourceName.split(/[\\/]/).pop() || "photo";
  if (/\.[a-z0-9]{1,8}$/i.test(baseName)) return baseName;

  const extension = String(file.type || "image/jpeg").split("/")[1]?.split("+")[0] || "jpeg";
  return `${baseName}.${extension === "jpeg" ? "jpg" : extension}`;
}

function openResultImagePreview(sourceCanvas, label) {
  if (!sourceCanvas.width || !sourceCanvas.height) return;

  resultImagePreviewCanvas.width = sourceCanvas.width;
  resultImagePreviewCanvas.height = sourceCanvas.height;
  resultImagePreviewCanvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
  resultImagePreviewCanvas.setAttribute("aria-label", `Expanded preview of ${label}`);
  resultImagePreviewOpener = sourceCanvas;
  resultImagePreviewBackdrop.hidden = false;
  resultImagePreviewShell.hidden = false;
  document.body.classList.add("modalOpen");

  window.requestAnimationFrame(() => {
    closeResultImagePreviewButton.focus({ preventScroll: true });
  });
}

function closeResultImagePreview() {
  if (resultImagePreviewShell.hidden) return;

  resultImagePreviewBackdrop.hidden = true;
  resultImagePreviewShell.hidden = true;
  resultImagePreviewCanvas.width = 0;
  resultImagePreviewCanvas.height = 0;
  document.body.classList.remove("modalOpen");

  if (resultImagePreviewOpener?.isConnected) {
    const resultArticle = resultImagePreviewOpener.closest(".result");
    (resultArticle || resultImagePreviewOpener).focus({ preventScroll: true });
  }
  resultImagePreviewOpener = null;
}

function navigateResultImagePreview(direction) {
  const imageNodes = getVisibleDetectionResultNodes()
    .filter((node) => node.article.dataset.kind === "image" && node.canvas.width > 0);
  if (imageNodes.length < 2) return;

  const currentIndex = imageNodes.findIndex((node) => node.canvas === resultImagePreviewOpener);
  const nextIndex = currentIndex < 0
    ? direction < 0 ? imageNodes.length - 1 : 0
    : (currentIndex + direction + imageNodes.length) % imageNodes.length;
  const nextNode = imageNodes[nextIndex];
  openResultImagePreview(nextNode.canvas, nextNode.displayPath);
}

function handleDetectionResultsKeydown(event) {
  const article = event.target.closest?.(".result");
  if (!article || event.target !== article || !event.key.startsWith("Arrow")) return;
  navigateGridWithArrowKey(event, results, article, ".result:not([hidden])");
}

function handleTargetFacesKeydown(event) {
  const article = event.target.closest?.(".faceCard");
  if (!article || event.target !== article || !event.key.startsWith("Arrow")) return;
  navigateGridWithArrowKey(event, facesGrid, article, ".faceCard:not([hidden])");
}

function navigateGridWithArrowKey(event, container, currentItem, selector) {
  const items = Array.from(container.querySelectorAll(selector));
  const currentIndex = items.indexOf(currentItem);
  if (currentIndex < 0 || items.length < 2) return;

  const columns = getGridColumnCount(container);
  const offsets = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -columns,
    ArrowDown: columns,
  };
  const nextIndex = currentIndex + offsets[event.key];
  if (nextIndex < 0 || nextIndex >= items.length) return;

  event.preventDefault();
  items[nextIndex].focus({ preventScroll: true });
  items[nextIndex].scrollIntoView({ block: "nearest", inline: "nearest" });
}

function getGridColumnCount(container) {
  const columns = window.getComputedStyle(container).gridTemplateColumns;
  return Math.max(1, columns.split(" ").filter(Boolean).length);
}

function getVisibleDetectionResultNodes() {
  return Array.from(results.querySelectorAll(".result:not([hidden])"))
    .map((article) => article.fdxResultNode)
    .filter(Boolean);
}

async function detectFile(file, node, signal) {
  node.summary.textContent = "Detecting";
  let image;
  try {
    image = await loadImage(file);
  } catch (error) {
    node.summary.classList.add("error");
    node.summary.textContent = error.message;
    return "error";
  }
  node.imageAnalysis = { image, faces: [] };
  drawImage(node.canvas, image);

  try {
    const needsMatching = hasSearchableTargets();
    const detection = await findFacesWithSourceCache(file, "image", {
      backend: BACKEND_ACCURATE,
      facePlugins: FACE_MATCH_PLUGINS,
      threshold: getApiThreshold(),
    }, signal);
    const faces = detection.faces.map(normalizeAccurateDetectionFace);
    collectDetectionSourceFaceSamples(file, detection.cacheKey, faces, image);
    const matchedFaces = needsMatching ? faces.map(addRealtimeTargetMatch) : faces;
    node.cacheHit = detection.cacheHit;
    node.imageAnalysis = { image, faces: matchedFaces };
    drawImage(node.canvas, image);
    node.summary.classList.remove("error");
    node.summary.textContent = `${createDetectionSummary(matchedFaces)}${detection.cacheHit ? " · cached" : ""}`;
    return needsMatching && matchedFaces.some((face) => face.match?.isMatch)
      ? "match"
      : needsMatching ? "no-match" : "detected";
  } catch (error) {
    if (error?.name === "AbortError") return "cancelled";
    try {
      const detection = await findFacesWithSourceCache(file, "image", {
        backend: BACKEND_ACCURATE,
        facePlugins: FACE_DETECTION_PLUGINS,
        threshold: getApiThreshold(),
      }, signal);
      const faces = detection.faces;
      node.cacheHit = detection.cacheHit;
      node.imageAnalysis = { image, faces };
      drawImage(node.canvas, image);
      node.summary.classList.add("error");
      const unavailableText = hasSearchableTargets()
        ? "target matching unavailable"
        : "face embeddings unavailable";
      node.summary.textContent = `${createDetectionSummary(faces)} · ${unavailableText}${detection.cacheHit ? " · cached" : ""}`;
      return "error";
    } catch (fallbackError) {
      if (fallbackError?.name === "AbortError") return "cancelled";
      node.summary.classList.add("error");
      node.summary.textContent = fallbackError.message;
      return "error";
    }
  }
}

function yieldToBrowser() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function findFaces(
  file,
  facePlugins,
  allowNoFaces = false,
  backend = BACKEND_ACCURATE,
  threshold = getApiThreshold(),
  signal,
  requestOptions = {},
) {
  await ensureDetectorModelsReady();
  const data = new FormData();
  data.append("file", file, file.name);
  const query = new URLSearchParams({
    face_plugins: facePlugins,
    limit: "0",
    det_prob_threshold: String(threshold),
  });
  if (requestOptions.inputMode) query.set("input_mode", requestOptions.inputMode);
  const url = `${getFindFacesPath(backend)}?${query}`;
  const { response, payload } = await fetchDetectorJson(url, { method: "POST", body: data, signal });

  if (!response.ok) {
    const message = payload.message || `HTTP ${response.status}`;
    if (allowNoFaces && response.status === 400 && /no face/i.test(message)) {
      return { ...payload, result: [] };
    }
    throw new Error(message);
  }

  validateDetectorResponseModels(payload, facePlugins);
  return payload;
}

function getFindFacesPath(backend) {
  if (backend !== BACKEND_ACCURATE) {
    throw new Error(`Unsupported detector backend: ${backend}`);
  }
  return "/api/accurate/find_faces";
}

async function detectVideo(file, node, generation, signal) {
  node.imageStage.hidden = true;
  node.videoStage.hidden = false;
  node.summary.textContent = "Loading video";
  node.renderVideoOverlay = null;
  node.videoAnalysis = null;

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

    await ensureDetectorModelsReady();
    throwIfDetectionAborted(signal);
    const cacheKey = await createDetectionCacheKey(file, "video", {
      backend: BACKEND_ACCURATE,
      facePlugins: FACE_MATCH_PLUGINS,
      threshold: getApiThreshold(),
      frameInterval: sampleInterval,
      maxSide: VIDEO_MAX_SIDE,
      trackMinIou: TRACK_MIN_IOU,
      trackMinEmbeddingSimilarity: TRACK_MIN_EMBEDDING_SIMILARITY,
    });
    throwIfDetectionAborted(signal);
    const cached = await readDetectionCacheEntry(cacheKey);
    throwIfDetectionAborted(signal);
    if (isUsableCachedVideoAnalysis(cached, sampleInterval)) {
      node.cacheHit = true;
      return installCompletedVideoAnalysis(
        node,
        cached.analysis.playbackSamples,
        cached.analysis.confirmedTracks,
        cached.analysis.sampleInterval,
        true,
      );
    }

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
          useEmbeddings ? FACE_MATCH_PLUGINS : FACE_DETECTION_PLUGINS,
          true,
          BACKEND_ACCURATE,
          getApiThreshold(),
          signal,
        );
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        if (!useEmbeddings) throw error;
        useEmbeddings = false;
        payload = await findFaces(
          frameFile,
          FACE_DETECTION_PLUGINS,
          true,
          BACKEND_ACCURATE,
          getApiThreshold(),
          signal,
        );
      }

      const detectedFaces = Array.isArray(payload.result)
        ? payload.result.map((face) => (useEmbeddings ? normalizeAccurateDetectionFace(face) : face))
        : [];
      const faces = useEmbeddings ? detectedFaces.map(addRealtimeTargetMatch) : detectedFaces;
      nextTrackId = assignFaceTracks(
        faces,
        tracks,
        timestamp,
        sampleInterval,
        nextTrackId,
      );
      samples.push({ timestamp, faces });
    }

    if (generation !== processingGeneration) return "cancelled";

    const { confirmedTracks, playbackSamples } = createConfirmedVideoAnalysis(samples, tracks);
    const cacheableAnalysis = createCacheableVideoAnalysis(
      playbackSamples,
      confirmedTracks,
      sampleInterval,
      useEmbeddings,
    );
    await writeDetectionCacheEntry(cacheKey, {
      kind: "video",
      modelSignature: DETECTION_MODEL_CACHE_SIGNATURE,
      analysis: cacheableAnalysis,
    });
    return installCompletedVideoAnalysis(
      node,
      playbackSamples,
      confirmedTracks,
      sampleInterval,
      false,
    );
  } catch (error) {
    if (error?.name === "AbortError") return "cancelled";
    node.video.controls = true;
    node.summary.classList.add("error");
    node.summary.textContent = error.message;
    return "error";
  } finally {
    decoder.pause();
    decoder.removeAttribute("src");
    decoder.load();
  }
}

function isUsableCachedVideoAnalysis(cached, sampleInterval) {
  return cached?.kind === "video"
    && cached.modelSignature === DETECTION_MODEL_CACHE_SIGNATURE
    && Array.isArray(cached.analysis?.playbackSamples)
    && Array.isArray(cached.analysis?.confirmedTracks)
    && Number(cached.analysis?.sampleInterval) === Number(sampleInterval)
    && (!hasSearchableTargets() || cached.analysis?.hasEmbeddings !== false);
}

function createCacheableVideoAnalysis(playbackSamples, confirmedTracks, sampleInterval, hasEmbeddings) {
  return {
    sampleInterval,
    hasEmbeddings,
    playbackSamples: playbackSamples.map((sample) => ({
      timestamp: sample.timestamp,
      faces: sample.faces.map(createCacheableDetectedFace),
    })),
    confirmedTracks: confirmedTracks.map((track) => ({
      ...track,
      name: null,
      targetId: null,
      box: track.box ? { ...track.box } : null,
      embedding: Array.isArray(track.embedding) ? [...track.embedding] : null,
    })),
  };
}

function createCacheableDetectedFace(face) {
  const cachedFace = {
    ...face,
    box: face.box ? { ...face.box } : face.box,
    track: face.track ? { ...face.track } : face.track,
  };
  delete cachedFace.match;
  delete cachedFace.fastMatch;
  return cachedFace;
}

async function installCompletedVideoAnalysis(
  node,
  playbackSamples,
  confirmedTracks,
  sampleInterval,
  cacheHit,
) {
  playbackSamples.forEach((sample) => {
    sample.faces.forEach(refreshFaceTargetMatch);
  });
  refreshTrackTargetLabels(confirmedTracks, playbackSamples);
  await waitForVideoMetadata(node.video);
  node.video.controls = true;
  node.video.currentTime = 0;
  node.renderVideoOverlay = installVideoOverlayPlayback(
    node.video,
    node.videoOverlay,
    playbackSamples,
    sampleInterval,
  );
  node.videoAnalysis = {
    playbackSamples,
    confirmedTracks,
    sampleInterval,
  };
  node.summary.classList.remove("error");
  node.summary.textContent = `${createVideoSummary(
    playbackSamples,
    confirmedTracks,
    sampleInterval,
  )}${cacheHit ? " · cached" : ""}`;
  return confirmedTracks.some((track) => track.targetId)
    ? "match"
    : hasSearchableTargets() ? "no-match" : "detected";
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

async function handleTargetPickerSelection(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  targetFileInput.value = "";

  if (files.length === 0) return;
  if (files.length === 1) {
    await openTargetDrawPanel(files[0]);
    return;
  }

  await handleTargetFiles(files);
}

async function handleTargetFiles(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  if (files.length > 0) {
    closeTargetDrawPanel();
  }
  const addedEntries = [];
  for (const file of files) {
    addedEntries.push(...await addTargetFaceFile(file));
  }
  targetFileInput.value = "";
  updateDetectionsAfterTargetEnrollment(addedEntries);
}

async function addTargetFaceFile(file, options = {}) {
  const {
    singleFace = false,
    croppedFace = false,
    addFallback = true,
    identityId = null,
    sourceName = file.name,
    defaultName = getDefaultTargetName(sourceName),
  } = options;
  const image = await loadImage(file);
  const baseName = defaultName || getDefaultTargetName(file.name);

  try {
    const targetDetection = await findFacesWithSourceCache(file, "target", {
      backend: BACKEND_ACCURATE,
      facePlugins: FACE_MATCH_PLUGINS,
      threshold: croppedFace ? CROPPED_TARGET_DETECTION_THRESHOLD : TARGET_DETECTION_THRESHOLD,
      requestOptions: croppedFace ? { inputMode: "cropped" } : {},
    });
    const accurateFaces = targetDetection.faces.map(normalizeAccurateDetectionFace);
    const selectedFaces = singleFace ? selectPrimaryTargetFace(accurateFaces, image) : accurateFaces;
    const candidateEntries = selectedFaces
      .map((face, index) => createFaceEntry(
        file,
        image,
        face,
        index,
        getEntryName(baseName, index, selectedFaces.length),
        sourceName,
        {
          minimumFaceSize: croppedFace
            ? MIN_CROPPED_TARGET_FACE_SIZE_PX
            : MIN_MATCH_FACE_SIZE_PX,
        },
      ))
      .filter(Boolean);
    const entries = candidateEntries
      .filter((entry) => Array.isArray(entry.fastEmbedding) || Array.isArray(entry.accurateEmbedding));

    if (entries.length === 0) {
      throw new Error(
        candidateEntries[0]?.status
        || (accurateFaces.length > 0 ? "No searchable face found" : "No face found"),
      );
    }

    entries.forEach((entry) => {
      if (!linkTargetEntryToIdentity(entry, identityId)) {
        reuseExistingTargetIdentity(entry);
      }
    });
    targetFaces.unshift(...entries);
    renderTargetFaces();
    return entries;
  } catch (error) {
    if (!addFallback) throw error;

    const fallback = createFallbackTarget(file, image, baseName, error.message, sourceName);
    targetFaces.unshift(fallback);
    renderTargetFaces();
    return [fallback];
  }
}

function linkTargetEntryToIdentity(entry, identityId) {
  if (!identityId) return false;
  const existingTarget = targetFaces.find((target) => (
    getTargetIdentityKey(target) === identityId
    && hasTargetEmbedding(target)
  ));
  if (!existingTarget) return false;

  const identityName = String(existingTarget.displayName || existingTarget.name || "").trim()
    || getTargetLabel(existingTarget);
  entry.identityId = identityId;
  entry.name = identityName;
  entry.displayName = identityName;
  return true;
}

function reuseExistingTargetIdentity(entry) {
  const accurateEmbedding = getTargetAccurateEmbedding(entry);
  const fastEmbedding = accurateEmbedding ? null : getTargetFastEmbedding(entry);
  const bestMatch = accurateEmbedding
    ? getBestTargetMatchForEmbedding(accurateEmbedding, getTargetAccurateEmbedding)
    : getBestTargetMatchForEmbedding(fastEmbedding, getTargetFastEmbedding);
  if (!bestMatch || !isAcceptedMatch(bestMatch, entry.quality)) return;

  const identityName = String(bestMatch.target.displayName || bestMatch.target.name || "").trim()
    || getTargetLabel(bestMatch.target);
  entry.identityId = getTargetIdentityKey(bestMatch.target);
  entry.name = identityName;
  entry.displayName = identityName;
}

function updateDetectionsAfterTargetEnrollment(entries) {
  const searchableEntries = entries.filter(hasTargetEmbedding);
  if (searchableEntries.length === 0) return;

  clearSourceIdentityExpansions();
  // The result grid only retains files that matched the previous gallery.
  // Re-score those immediately, then replay the complete source so files that
  // only match a newly enrolled angle can be restored from cached embeddings.
  refreshCachedTargetMatches();
  requestCurrentDetectionSourceRefresh();
}

function selectPrimaryTargetFace(faces, image) {
  const imageArea = Math.max(1, image.naturalWidth * image.naturalHeight);
  const imageCenterX = image.naturalWidth / 2;
  const imageCenterY = image.naturalHeight / 2;
  const scoredFaces = faces
    .map((face) => {
      const box = normalizeBox(face.box, image.naturalWidth, image.naturalHeight);
      if (!box) return null;

      const faceArea = (box.width * box.height) / imageArea;
      const faceCenterX = box.xMin + box.width / 2;
      const faceCenterY = box.yMin + box.height / 2;
      const centerDistance = Math.hypot(
        (faceCenterX - imageCenterX) / image.naturalWidth,
        (faceCenterY - imageCenterY) / image.naturalHeight,
      );
      const probability = Number(face.box?.probability || 0);

      return {
        face,
        score: probability + faceArea * 2 - centerDistance,
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score);

  return scoredFaces[0] ? [scoredFaces[0].face] : [];
}

async function openTargetDrawPanel(file) {
  stopFaceCaptureCamera({ hidePanel: true });
  targetDrawState = null;
  targetDrawPanel.hidden = false;
  targetDrawCanvas.width = 0;
  targetDrawCanvas.height = 0;
  targetDrawStatus.textContent = "Loading image";
  addTargetImageButton.disabled = true;
  addDrawnTargetButton.disabled = true;
  cancelDrawTargetButton.disabled = false;
  targetFileInput.disabled = true;
  targetAddButton.disabled = true;

  try {
    const image = await loadImage(file);
    targetDrawState = {
      file,
      image,
      isDrawing: false,
      startPoint: null,
      selection: null,
    };
    renderTargetIdentityOptions();
    renderTargetDrawCanvas();
    targetDrawStatus.textContent = "Image ready";
    addTargetImageButton.disabled = false;
  } catch (error) {
    targetDrawState = null;
    targetDrawStatus.textContent = error?.message || "Could not read image";
  } finally {
    targetFileInput.disabled = false;
    targetAddButton.disabled = false;
  }
}

function closeTargetDrawPanel() {
  targetDrawState = null;
  targetDrawPanel.hidden = true;
  targetDrawCanvas.width = 0;
  targetDrawCanvas.height = 0;
  targetDrawStatus.textContent = "Select a face area";
  addTargetImageButton.disabled = true;
  addDrawnTargetButton.disabled = true;
  targetIdentitySelect.value = "";
  targetIdentityControl.hidden = true;
  cancelDrawTargetButton.disabled = false;
  targetFileInput.disabled = false;
  targetAddButton.disabled = false;
}

function renderTargetDrawCanvas() {
  if (!targetDrawState) return;

  const { image, selection, isDrawing } = targetDrawState;
  const maxWidth = 920;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = targetDrawCanvas.getContext("2d");

  if (targetDrawCanvas.width !== width || targetDrawCanvas.height !== height) {
    targetDrawCanvas.width = width;
    targetDrawCanvas.height = height;
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  if (selection) {
    drawTargetSelection(context, selection, isDrawing);
  }
}

function drawTargetSelection(context, selection, isDrawing) {
  const color = isDrawing ? TONE_WHITE : TONE_GRAY;

  context.save();
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.setLineDash(isDrawing ? [8, 5] : []);
  context.strokeRect(selection.x, selection.y, selection.width, selection.height);
  context.restore();
}

function startTargetDrawSelection(event) {
  if (!targetDrawState) return;

  event.preventDefault();
  const point = getTargetDrawCanvasPoint(event);
  targetDrawState.isDrawing = true;
  targetDrawState.startPoint = point;
  targetDrawState.selection = createTargetDrawSelection(point, point);
  try {
    targetDrawCanvas.setPointerCapture(event.pointerId);
  } catch (error) {
    // Pointer capture is unavailable for synthetic events and some older browsers.
  }
  addDrawnTargetButton.disabled = true;
  targetDrawStatus.textContent = "Drawing selection";
  renderTargetDrawCanvas();
}

function updateTargetDrawSelection(event) {
  if (!targetDrawState?.isDrawing) return;

  event.preventDefault();
  const point = getTargetDrawCanvasPoint(event);
  targetDrawState.selection = createTargetDrawSelection(targetDrawState.startPoint, point);
  renderTargetDrawCanvas();
}

function finishTargetDrawSelection(event) {
  if (!targetDrawState?.isDrawing) return;

  event.preventDefault();
  try {
    if (targetDrawCanvas.hasPointerCapture(event.pointerId)) {
      targetDrawCanvas.releasePointerCapture(event.pointerId);
    }
  } catch (error) {
    // Ignore pointer capture cleanup when capture was not established.
  }

  const point = getTargetDrawCanvasPoint(event);
  targetDrawState.selection = createTargetDrawSelection(targetDrawState.startPoint, point);
  targetDrawState.isDrawing = false;

  if (!isUsableTargetSelection(targetDrawState.selection)) {
    targetDrawState.selection = null;
    addDrawnTargetButton.disabled = true;
    targetDrawStatus.textContent = "Selection too small";
  } else {
    addDrawnTargetButton.disabled = false;
    targetDrawStatus.textContent = "Selection ready";
  }

  renderTargetDrawCanvas();
}

function getTargetDrawCanvasPoint(event) {
  const rect = targetDrawCanvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? targetDrawCanvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? targetDrawCanvas.height / rect.height : 1;

  return {
    x: clamp((event.clientX - rect.left) * scaleX, 0, targetDrawCanvas.width),
    y: clamp((event.clientY - rect.top) * scaleY, 0, targetDrawCanvas.height),
  };
}

function createTargetDrawSelection(start, end) {
  const x = clamp(Math.min(start.x, end.x), 0, targetDrawCanvas.width);
  const y = clamp(Math.min(start.y, end.y), 0, targetDrawCanvas.height);
  const xMax = clamp(Math.max(start.x, end.x), x, targetDrawCanvas.width);
  const yMax = clamp(Math.max(start.y, end.y), y, targetDrawCanvas.height);

  return {
    x,
    y,
    width: xMax - x,
    height: yMax - y,
  };
}

function isUsableTargetSelection(selection) {
  return selection
    && selection.width >= MIN_TARGET_SELECTION_SIZE_PX
    && selection.height >= MIN_TARGET_SELECTION_SIZE_PX;
}

async function addTargetImageFace() {
  if (!targetDrawState?.file) return;

  const { file } = targetDrawState;
  targetDrawStatus.textContent = "Analyzing image";
  addTargetImageButton.disabled = true;
  addDrawnTargetButton.disabled = true;
  cancelDrawTargetButton.disabled = true;
  targetFileInput.disabled = true;
  targetAddButton.disabled = true;
  openFaceCaptureButton.disabled = true;

  try {
    const entries = await addTargetFaceFile(file);
    updateDetectionsAfterTargetEnrollment(entries);
    closeTargetDrawPanel();
  } catch (error) {
    targetDrawStatus.textContent = error?.message || "Could not add image";
  } finally {
    cancelDrawTargetButton.disabled = false;
    targetFileInput.disabled = false;
    targetAddButton.disabled = false;
    openFaceCaptureButton.disabled = Boolean(faceCaptureStream?.active);

    if (targetDrawState) {
      addTargetImageButton.disabled = false;
      addDrawnTargetButton.disabled = !isUsableTargetSelection(targetDrawState.selection);
    }
  }
}

async function addDrawnTargetFace() {
  if (!targetDrawState || !isUsableTargetSelection(targetDrawState.selection)) return;

  const { file, image } = targetDrawState;
  targetDrawStatus.textContent = "Analyzing drawn face";
  addTargetImageButton.disabled = true;
  addDrawnTargetButton.disabled = true;
  cancelDrawTargetButton.disabled = true;
  targetFileInput.disabled = true;
  targetAddButton.disabled = true;
  openFaceCaptureButton.disabled = true;

  try {
    const cropBox = getTargetDrawImageBox(targetDrawState);
    const cropFile = await createTargetSelectionFile(image, cropBox, file.name);
    const entries = await addTargetFaceFile(cropFile, {
      singleFace: true,
      croppedFace: true,
      addFallback: false,
      identityId: targetIdentitySelect.value || null,
      sourceName: file.name,
      defaultName: getDefaultTargetName(file.name),
    });
    updateDetectionsAfterTargetEnrollment(entries);
  } catch (error) {
    batchProgress.hidden = false;
    batchProgress.textContent = error?.message || "Could not add selected face";
  } finally {
    closeTargetDrawPanel();
    cancelDrawTargetButton.disabled = false;
    targetFileInput.disabled = false;
    targetAddButton.disabled = false;
    openFaceCaptureButton.disabled = Boolean(faceCaptureStream?.active);
  }
}

function getTargetDrawImageBox({ image, selection }) {
  const scaleX = image.naturalWidth / targetDrawCanvas.width;
  const scaleY = image.naturalHeight / targetDrawCanvas.height;

  return {
    xMin: clamp(Math.round(selection.x * scaleX), 0, image.naturalWidth),
    yMin: clamp(Math.round(selection.y * scaleY), 0, image.naturalHeight),
    width: clamp(Math.round(selection.width * scaleX), 1, image.naturalWidth),
    height: clamp(Math.round(selection.height * scaleY), 1, image.naturalHeight),
  };
}

function createTargetSelectionFile(image, box, originalName) {
  const paddedBox = getPaddedTargetSelectionBox(image, box);
  const canvas = document.createElement("canvas");
  const width = paddedBox.width;
  const height = paddedBox.height;
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    paddedBox.xMin,
    paddedBox.yMin,
    width,
    height,
    0,
    0,
    width,
    height,
  );

  return canvasToPngFile(canvas, `${getDefaultTargetName(originalName)}-drawn-face.png`);
}

function getPaddedTargetSelectionBox(image, box) {
  const padding = Math.round(Math.max(box.width, box.height) * TARGET_CROP_PADDING);
  const xMin = clamp(Math.floor(box.xMin - padding), 0, image.naturalWidth - 1);
  const yMin = clamp(Math.floor(box.yMin - padding), 0, image.naturalHeight - 1);
  const xMax = clamp(Math.ceil(box.xMin + box.width + padding), xMin + 1, image.naturalWidth);
  const yMax = clamp(Math.ceil(box.yMin + box.height + padding), yMin + 1, image.naturalHeight);
  return { xMin, yMin, width: xMax - xMin, height: yMax - yMin };
}

function canvasToPngFile(canvas, fileName) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not encode selected face"));
        return;
      }
      resolve(new File([blob], fileName, { type: "image/png" }));
    }, "image/png");
  });
}

async function startFaceCaptureCamera() {
  if (faceCaptureStream?.active) return;
  if (faceCaptureStartPromise) return faceCaptureStartPromise;

  closeTargetDrawPanel();
  showFaceCapturePopup();
  faceCaptureStartPromise = openFaceCaptureCamera();
  try {
    await faceCaptureStartPromise;
  } finally {
    faceCaptureStartPromise = null;
  }
}

function showFaceCapturePopup() {
  faceCaptureBackdrop.hidden = false;
  faceCaptureShell.hidden = false;
  document.body.classList.add("modalOpen");
  window.requestAnimationFrame(() => {
    faceCaptureShell.focus({ preventScroll: true });
  });
}

function hideFaceCapturePopup() {
  const wasOpen = !faceCaptureShell.hidden;
  faceCaptureBackdrop.hidden = true;
  faceCaptureShell.hidden = true;
  document.body.classList.remove("modalOpen");
  if (wasOpen) {
    openFaceCaptureButton.focus({ preventScroll: true });
  }
}

function closeFaceCapturePopup() {
  if (faceCaptureShell.hidden || faceCaptureStartPromise || faceCaptureAddInProgress) return;
  stopFaceCaptureCamera({ hidePanel: true });
}

async function openFaceCaptureCamera() {
  openFaceCaptureButton.disabled = true;
  captureFaceButton.disabled = true;
  retakeFaceCaptureButton.disabled = true;
  latestFaceCaptureIds = [];
  faceCaptureStatus.textContent = "Requesting camera access";
  faceCaptureIdle.hidden = false;
  faceCaptureIdle.querySelector("strong").textContent = "Opening camera";
  faceCaptureIdle.querySelector("p").textContent = "Allow camera access when prompted.";

  try {
    if (!window.isSecureContext) {
      throw new Error("Camera access requires HTTPS or localhost");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support camera access");
    }
    if (scanStream) {
      stopScanCamera();
    }

    const stream = await openCameraStream();

    faceCaptureStream = stream;
    faceCaptureVideo.srcObject = stream;
    await waitForVideoMetadata(faceCaptureVideo);
    await faceCaptureVideo.play();

    const cameraName = stream.getVideoTracks()[0]?.label || "Default camera";
    faceCapturePanel.classList.add("cameraReady");
    faceCaptureIdle.hidden = true;
    openFaceCaptureButton.textContent = "Camera open";
    captureFaceButton.disabled = false;
    faceCaptureStatus.textContent = `${cameraName} ready`;
  } catch (error) {
    releaseFaceCaptureCamera();
    faceCapturePanel.classList.remove("cameraReady");
    faceCaptureIdle.hidden = false;
    faceCaptureIdle.querySelector("strong").textContent = "Camera access needed";
    faceCaptureIdle.querySelector("p").textContent = getCameraErrorMessage(error);
    openFaceCaptureButton.textContent = "Retry camera";
    captureFaceButton.disabled = true;
    retakeFaceCaptureButton.disabled = true;
    faceCaptureStatus.textContent = "Camera unavailable";
  } finally {
    openFaceCaptureButton.disabled = Boolean(faceCaptureStream?.active);
  }
}

function stopFaceCaptureCamera({ hidePanel = false } = {}) {
  releaseFaceCaptureCamera();
  faceCapturePanel.classList.remove("cameraReady", "processing");
  faceCaptureIdle.hidden = false;
  faceCaptureIdle.querySelector("strong").textContent = "Camera standby";
  faceCaptureIdle.querySelector("p").textContent = "Open the camera and center your face.";
  openFaceCaptureButton.disabled = false;
  openFaceCaptureButton.textContent = "Use camera";
  captureFaceButton.disabled = true;
  captureFaceButton.textContent = "Capture face";
  retakeFaceCaptureButton.disabled = true;
  faceCaptureStatus.textContent = "Camera idle";
  faceCaptureAddInProgress = false;
  latestFaceCaptureIds = [];

  if (hidePanel) {
    hideFaceCapturePopup();
  }
}

function releaseFaceCaptureCamera() {
  faceCaptureStream?.getTracks().forEach((track) => track.stop());
  faceCaptureStream = null;
  faceCaptureVideo.pause();
  faceCaptureVideo.srcObject = null;
}

async function addCurrentFaceCapture() {
  if (!faceCaptureStream?.active || faceCaptureAddInProgress) return;

  faceCaptureAddInProgress = true;
  faceCapturePanel.classList.add("processing");
  captureFaceButton.disabled = true;
  retakeFaceCaptureButton.disabled = true;
  openFaceCaptureButton.disabled = true;
  targetFileInput.disabled = true;
  targetAddButton.disabled = true;
  faceCaptureStatus.textContent = "Capturing face";

  try {
    const file = await captureFaceFrame();
    faceCaptureStatus.textContent = "Analyzing captured face";
    const entries = await addTargetFaceFile(file);
    latestFaceCaptureIds = entries.map((entry) => entry.id).filter(Boolean);
    const searchableCount = entries.filter(hasTargetEmbedding).length;
    faceCaptureStatus.textContent = searchableCount > 0
      ? `${searchableCount} target face${searchableCount === 1 ? "" : "s"} captured`
      : entries[0]?.status || "No searchable face captured";
    captureFaceButton.textContent = "Done – Press to Continue";
    retakeFaceCaptureButton.disabled = latestFaceCaptureIds.length === 0;
    if (searchableCount > 0) updateDetectionsAfterTargetEnrollment(entries);
  } catch (error) {
    latestFaceCaptureIds = [];
    faceCaptureStatus.textContent = error?.message || "Could not capture face";
    retakeFaceCaptureButton.disabled = true;
  } finally {
    faceCaptureAddInProgress = false;
    faceCapturePanel.classList.remove("processing");
    captureFaceButton.disabled = !faceCaptureStream?.active;
    openFaceCaptureButton.disabled = Boolean(faceCaptureStream?.active);
    targetFileInput.disabled = false;
    targetAddButton.disabled = false;
  }
}

function retakeLatestFaceCapture() {
  if (faceCaptureAddInProgress || latestFaceCaptureIds.length === 0) return;

  const idsToRemove = new Set(latestFaceCaptureIds);
  const removedTargetIds = new Set();
  for (let index = targetFaces.length - 1; index >= 0; index -= 1) {
    if (!idsToRemove.has(targetFaces[index].id)) continue;
    const [removedFace] = targetFaces.splice(index, 1);
    removedTargetIds.add(removedFace.id);
  }

  latestFaceCaptureIds = [];
  captureFaceButton.textContent = "Capture face";
  retakeFaceCaptureButton.disabled = true;

  if (removedTargetIds.size > 0) {
    refreshCachedTargetMatches(removedTargetIds);
    renderTargetFaces();
  }

  captureFaceButton.disabled = !faceCaptureStream?.active;
  faceCaptureStatus.textContent = faceCaptureStream?.active
    ? "Ready for retake"
    : "Camera idle";
}

function captureFaceFrame() {
  if (!faceCaptureVideo.videoWidth || !faceCaptureVideo.videoHeight) {
    return Promise.reject(new Error("Camera frame is not ready yet"));
  }

  const canvas = document.createElement("canvas");
  canvas.width = faceCaptureVideo.videoWidth;
  canvas.height = faceCaptureVideo.videoHeight;
  const context = canvas.getContext("2d");
  context.drawImage(faceCaptureVideo, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not encode camera frame"));
        return;
      }
      resolve(new File([blob], "Captured face.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
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

function createFaceEntry(
  file,
  image,
  face,
  index,
  name,
  sourceName = file.name,
  { minimumFaceSize = MIN_MATCH_FACE_SIZE_PX } = {},
) {
  const box = normalizeBox(face.box, image.naturalWidth, image.naturalHeight);
  if (!box) return null;

  const preview = createFacePreview(image, box);
  const probability = Number(face.box?.probability || 0);
  const matchQuality = getFaceMatchQuality(face, { minimumFaceSize });
  const accurateEmbedding = matchQuality.isMatchable ? getFaceAccurateEmbedding(face) : null;
  const fastEmbedding = null;
  const searchableEmbedding = accurateEmbedding;
  let status = "No embedding";
  if (!matchQuality.isMatchable) {
    status = matchQuality.quality.reason === "face too small"
      ? `Face too small · ${matchQuality.quality.width} x ${matchQuality.quality.height}px`
      : `Not enrolled · ${matchQuality.quality.reason}`;
  } else if (accurateEmbedding && matchQuality.quality.level === "low") {
    status = "Ready · AdaFace IR101 · low-resolution";
  } else if (accurateEmbedding) {
    status = "Ready · AdaFace IR101";
  }

  const id = `${Date.now()}-${file.name}-${index}`;
  return {
    id,
    identityId: `target:${id}`,
    index: index + 1,
    name,
    source: sourceName,
    probability,
    width: Math.round(box.width),
    height: Math.round(box.height),
    preview,
    embedding: searchableEmbedding,
    accurateEmbedding,
    embeddingNorm: Number.isFinite(Number(face?.embeddingNorm ?? face?.embedding_norm))
      ? Number(face.embeddingNorm ?? face.embedding_norm)
      : null,
    fastEmbedding,
    quality: matchQuality.quality,
    status,
  };
}

function createFallbackTarget(file, image, name, message, sourceName = file.name) {
  const fullImageBox = {
    xMin: 0,
    yMin: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
  const id = `${Date.now()}-${file.name}-fallback`;
  return {
    id,
    identityId: `target:${id}`,
    index: 1,
    name,
    source: sourceName,
    probability: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
    preview: createFacePreview(image, fullImageBox),
    embedding: null,
    accurateEmbedding: null,
    fastEmbedding: null,
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

function normalizeAccurateDetectionFace(face) {
  const accurateEmbedding = Array.isArray(face?.accurateEmbedding)
    ? face.accurateEmbedding
    : Array.isArray(face?.embedding) ? face.embedding : null;
  return {
    ...face,
    accurateEmbedding,
    embeddingNorm: Number.isFinite(Number(face?.embedding_norm))
      ? Number(face.embedding_norm)
      : null,
    fastEmbedding: null,
    embedding: accurateEmbedding,
  };
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
    const dimensions = fragment.querySelector("p");
    const nameInput = fragment.querySelector(".faceName");
    const deleteButton = fragment.querySelector(".faceDelete");
    const confidence = fragment.querySelector(".confidence");
    const source = fragment.querySelector(".source");

    image.src = face.preview;
    image.alt = `Target face ${face.index} from ${face.source}`;
    dimensions.textContent = `${face.width} x ${face.height}px`;
    const fallbackName = getTargetLabel(face, index);
    const initialName = getEditableTargetName(face, index);
    face.name = initialName;
    nameInput.value = initialName;
    nameInput.addEventListener("input", () => {
      const editedName = nameInput.value.trim() || fallbackName;
      setTargetIdentityName(face, editedName);
      deleteButton.setAttribute("aria-label", `Delete ${editedName}`);
      article.setAttribute("aria-label", `${editedName} from ${face.source}`);
      saveTargetFaces();
    });
    nameInput.addEventListener("change", () => {
      if (!nameInput.value.trim()) nameInput.value = face.name;
      refreshCachedTargetMatches();
    });
    deleteButton.setAttribute("aria-label", `Delete ${initialName}`);
    deleteButton.addEventListener("click", () => {
      deleteTargetFace(face.id);
    });
    confidence.textContent = hasTargetEmbedding(face) ? "Ready" : face.status || "n/a";
    source.textContent = face.source;
    article.dataset.faceId = face.id;
    article.tabIndex = 0;
    article.setAttribute("aria-label", `${initialName} from ${face.source}`);
    article.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown");
    facesGrid.append(article);
  });

  renderTargetIdentityOptions(targetIdentitySelect.value);
  saveTargetFaces();
  syncMatchFilter();
}

function renderTargetIdentityOptions(selectedIdentityId = "") {
  const identities = new Map();
  targetFaces.forEach((target, index) => {
    if (!hasTargetEmbedding(target)) return;
    const identityId = getTargetIdentityKey(target);
    if (identities.has(identityId)) return;
    identities.set(identityId, getTargetLabel(target, index));
  });

  targetIdentitySelect.replaceChildren();
  const newIdentityOption = document.createElement("option");
  newIdentityOption.value = "";
  newIdentityOption.textContent = "New person";
  targetIdentitySelect.append(newIdentityOption);
  identities.forEach((label, identityId) => {
    const option = document.createElement("option");
    option.value = identityId;
    option.textContent = label;
    targetIdentitySelect.append(option);
  });

  targetIdentitySelect.value = identities.has(selectedIdentityId)
    ? selectedIdentityId
    : "";
  targetIdentityControl.hidden = identities.size === 0;
}

function setTargetIdentityName(face, name) {
  const identityKey = getTargetIdentityKey(face);
  targetFaces.forEach((target) => {
    if (getTargetIdentityKey(target) !== identityKey) return;
    target.displayName = name;
    target.name = name;
  });
}

function getEditableTargetName(face, index) {
  const savedDisplayName = String(face.displayName || "").trim();
  if (savedDisplayName) return savedDisplayName;

  const currentName = String(face.name || "").trim();
  const defaultName = getDefaultTargetName(face.source);
  const numberedDefault = currentName.startsWith(`${defaultName} `)
    && /^\d+$/.test(currentName.slice(defaultName.length + 1));
  if (currentName && currentName !== defaultName && !numberedDefault) return currentName;

  return getTargetLabel(face, index);
}

function deleteTargetFace(faceId) {
  const index = targetFaces.findIndex((face) => face.id === faceId);
  if (index === -1) return;

  const [removedFace] = targetFaces.splice(index, 1);
  clearSourceIdentityExpansions();
  refreshCachedTargetMatches(new Set([removedFace.id]));
  renderTargetFaces();
  requestCurrentDetectionSourceRefresh();
}

function refreshCachedTargetMatches(removedTargetIds = new Set()) {
  refreshDetectionTargetMatches();
  refreshLiveTargetMatches(removedTargetIds);
  redrawDetectionOverlays();
}

function refreshDetectionTargetMatches() {
  results.querySelectorAll(".result").forEach((article) => {
    const node = article.fdxResultNode;
    if (!node) return;

    if (node.imageAnalysis) {
      refreshImageTargetMatches(node);
    }

    if (node.videoAnalysis) {
      refreshVideoTargetMatches(node);
    }
  });
}

function refreshImageTargetMatches(node) {
  const { faces } = node.imageAnalysis;
  faces.forEach(refreshFaceTargetMatch);

  if (isTargetAwareResultState(node.article.dataset.resultState)) {
    setResultState(node, getResultStateForTargetMatches(faces));
    node.summary.classList.remove("error");
    node.summary.textContent = createDetectionSummary(faces);
  }
}

function refreshVideoTargetMatches(node) {
  const {
    playbackSamples,
    confirmedTracks,
    sampleInterval,
  } = node.videoAnalysis;

  playbackSamples.forEach((sample) => {
    sample.faces.forEach(refreshFaceTargetMatch);
  });
  refreshTrackTargetLabels(confirmedTracks, playbackSamples);

  if (isTargetAwareResultState(node.article.dataset.resultState)) {
    setResultState(
      node,
      confirmedTracks.some((track) => track.targetId)
        ? "match"
        : hasSearchableTargets() ? "no-match" : "detected",
    );
    node.summary.classList.remove("error");
    node.summary.textContent = createVideoSummary(playbackSamples, confirmedTracks, sampleInterval);
  }
}

function refreshFaceTargetMatch(face) {
  const refreshedFace = addRealtimeTargetMatch(clearFaceTargetMatch(face));

  if (refreshedFace.match) {
    face.match = refreshedFace.match;
  } else {
    delete face.match;
  }

  if (refreshedFace.fastMatch) {
    face.fastMatch = refreshedFace.fastMatch;
  } else {
    delete face.fastMatch;
  }
}

function clearFaceTargetMatch(face) {
  const clearedFace = { ...face };
  delete clearedFace.match;
  delete clearedFace.fastMatch;
  return clearedFace;
}

function refreshTrackTargetLabels(tracks, samples) {
  const tracksById = new Map(tracks.map((track) => [track.id, track]));

  tracks.forEach((track) => {
    track.name = null;
    track.targetId = null;
  });

  samples.forEach((sample) => {
    sample.faces.forEach((face) => {
      const match = face.match?.isMatch ? face.match : null;
      const track = tracksById.get(face.track?.id);
      if (!match || !track || track.targetId) return;

      track.name = match.target.name || getTargetLabel(match.target);
      track.targetId = match.target.id;
    });
  });

  samples.forEach((sample) => {
    sample.faces.forEach((face) => {
      const track = tracksById.get(face.track?.id);
      if (!track) return;
      face.track = {
        ...face.track,
        name: track.name,
        targetId: track.targetId,
      };
    });
  });
}

function refreshLiveTargetMatches(removedTargetIds) {
  if (removedTargetIds.size === 0) return;

  liveScanTracks.forEach((track) => {
    if (!removedTargetIds.has(track.targetId)) return;

    track.name = null;
    track.targetId = null;
  });
  clearScanOverlay();
}

function isTargetAwareResultState(state) {
  return state === "match" || state === "no-match" || state === "detected";
}

function getResultStateForTargetMatches(faces) {
  if (!hasSearchableTargets()) return "detected";
  return faces.some((face) => face.match?.isMatch) ? "match" : "no-match";
}

function loadStoredTargetFaces() {
  try {
    const stored = JSON.parse(localStorage.getItem(TARGET_STORAGE_KEY) || "[]");
    const normalizedFaces = Array.isArray(stored)
      ? stored
        .filter((face) => face && face.id && face.preview)
        .map(normalizeStoredTargetFace)
      : [];
    return migrateStoredTargetIdentities(normalizedFaces);
  } catch (error) {
    return [];
  }
}

function normalizeStoredTargetFace(face) {
  const accurateEmbedding = Array.isArray(face.accurateEmbedding) ? face.accurateEmbedding : null;
  const legacyEmbedding = Array.isArray(face.embedding) ? face.embedding : null;
  const fastEmbedding = Array.isArray(face.fastEmbedding)
    ? face.fastEmbedding
    : accurateEmbedding ? null : legacyEmbedding;
  const searchableEmbedding = accurateEmbedding || fastEmbedding;
  return {
    ...face,
    identityId: typeof face.identityId === "string" && face.identityId.trim()
      ? face.identityId.trim()
      : null,
    embedding: searchableEmbedding,
    accurateEmbedding,
    embeddingNorm: Number.isFinite(Number(face.embeddingNorm ?? face.embedding_norm))
      ? Number(face.embeddingNorm ?? face.embedding_norm)
      : null,
    fastEmbedding,
    status: face.status || (searchableEmbedding ? "Ready" : "No embedding"),
  };
}

function migrateStoredTargetIdentities(faces) {
  const previouslySeen = [];

  // Targets are stored newest-first. Rebuild legacy identity links in original
  // enrollment order so an automatically reused angle can find its first
  // accepted sample without merging unrelated cards that share "Target 1".
  [...faces].reverse().forEach((face) => {
    if (!face.identityId) {
      const matchingTarget = findLegacyStoredIdentity(face, previouslySeen);
      face.identityId = matchingTarget?.identityId || `target:${face.id}`;
    }
    previouslySeen.push(face);
  });

  return faces;
}

function findLegacyStoredIdentity(face, candidates) {
  const inheritedName = String(face.displayName || "").trim().toLowerCase();
  if (!inheritedName) return null;

  const accurateEmbedding = normalizeEmbeddingVector(getTargetAccurateEmbedding(face));
  const fastEmbedding = accurateEmbedding
    ? null
    : normalizeEmbeddingVector(getTargetFastEmbedding(face));
  const getCandidateEmbedding = accurateEmbedding
    ? getTargetAccurateEmbedding
    : getTargetFastEmbedding;
  const probeEmbedding = accurateEmbedding || fastEmbedding;
  if (!probeEmbedding) return null;

  const bestCandidate = candidates
    .filter((candidate) => (
      String(candidate.displayName || candidate.name || "").trim().toLowerCase() === inheritedName
    ))
    .map((candidate) => ({
      candidate,
      similarity: getEmbeddingSimilarity(
        probeEmbedding,
        normalizeEmbeddingVector(getCandidateEmbedding(candidate)),
      ),
    }))
    .filter(({ similarity }) => Number.isFinite(similarity))
    .sort((first, second) => second.similarity - first.similarity)[0];
  if (!bestCandidate) return null;

  const { matchThreshold } = getMatchDecisionThresholds(face.quality);
  return bestCandidate.similarity >= matchThreshold ? bestCandidate.candidate : null;
}

function saveTargetFaces() {
  try {
    if (targetFaces.length === 0) {
      localStorage.removeItem(TARGET_STORAGE_KEY);
    } else {
      localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(targetFaces));
    }
  } catch (error) {
    // If storage quota is full, keep the current in-memory targets.
  }
}

function addBestTargetMatch(face) {
  const bestMatch = getBestTargetMatchForEmbedding(
    getFaceAccurateEmbedding(face),
    getTargetAccurateEmbedding,
  );
  if (!bestMatch) return face;
  const quality = getFaceMatchQuality(face);
  const decisionThresholds = getMatchDecisionThresholds(quality.quality);
  return {
    ...face,
    match: {
      ...bestMatch,
      ...quality,
      ...decisionThresholds,
      isCandidate: quality.isMatchable && isCandidateMatch(bestMatch),
      isMatch: quality.isMatchable && isAcceptedMatch(bestMatch, quality.quality),
    },
  };
}

function addBestFastTargetMatch(face) {
  const bestMatch = getBestTargetMatchForEmbedding(
    getFaceFastEmbedding(face),
    getTargetFastEmbedding,
  );
  if (!bestMatch) return face;
  const quality = getFaceMatchQuality(face);
  const decisionThresholds = getMatchDecisionThresholds(quality.quality);
  return {
    ...face,
    fastMatch: {
      ...bestMatch,
      ...quality,
      ...decisionThresholds,
      isCandidate: quality.isMatchable && isCandidateMatch(bestMatch),
      isMatch: quality.isMatchable && isAcceptedMatch(bestMatch, quality.quality),
    },
  };
}

function isCandidateMatch(match) {
  return Number.isFinite(match?.similarity) && match.similarity >= CANDIDATE_COSINE_THRESHOLD;
}

function getMatchDecisionThresholds(quality = {}) {
  const lowQuality = quality.level === "low";
  return {
    matchThreshold: lowQuality ? LOW_QUALITY_MATCH_COSINE_THRESHOLD : MATCH_COSINE_THRESHOLD,
    marginThreshold: lowQuality ? LOW_QUALITY_MATCH_COSINE_MARGIN : MATCH_COSINE_MARGIN,
  };
}

function isAcceptedMatch(match, quality) {
  const { matchThreshold, marginThreshold } = getMatchDecisionThresholds(quality);
  return Number.isFinite(match?.similarity)
    && match.similarity >= matchThreshold
    && (!Number.isFinite(match.secondSimilarity) || match.similarity - match.secondSimilarity >= marginThreshold);
}

function getFaceMatchQuality(
  face,
  { minimumFaceSize = MIN_MATCH_FACE_SIZE_PX } = {},
) {
  const box = face?.box || {};
  const preprocessingQuality = face?.quality || {};
  const detectedWidth = Math.max(0, Number(box.x_max || 0) - Number(box.x_min || 0));
  const detectedHeight = Math.max(0, Number(box.y_max || 0) - Number(box.y_min || 0));
  const width = Number.isFinite(Number(preprocessingQuality.source_face_width))
    ? Number(preprocessingQuality.source_face_width)
    : detectedWidth;
  const height = Number.isFinite(Number(preprocessingQuality.source_face_height))
    ? Number(preprocessingQuality.source_face_height)
    : detectedHeight;
  const probability = Number(face?.box?.probability || 0);
  const isLargeEnough = width >= minimumFaceSize && height >= minimumFaceSize;
  const isGoodSize = width >= GOOD_MATCH_FACE_SIZE_PX && height >= GOOD_MATCH_FACE_SIZE_PX;
  const hasReliableDetection = probability >= MIN_MATCH_DETECTION_PROBABILITY;
  const reason = !isLargeEnough
    ? "face too small"
    : !hasReliableDetection ? "low detector confidence"
      : isGoodSize ? "ok" : "low resolution";

  return {
    isMatchable: isLargeEnough && hasReliableDetection,
    quality: {
      width: Math.round(width),
      height: Math.round(height),
      detectionProbability: probability,
      level: !isLargeEnough ? "too-small" : isGoodSize ? "good" : "low",
      min_size: minimumFaceSize,
      good_size: GOOD_MATCH_FACE_SIZE_PX,
      min_detection_probability: MIN_MATCH_DETECTION_PROBABILITY,
      reason,
    },
  };
}

function addRealtimeTargetMatch(face) {
  const accurateMatchedFace = addBestTargetMatch(face);
  if (accurateMatchedFace.match) return accurateMatchedFace;

  const fastMatchedFace = addBestFastTargetMatch(face);
  if (!fastMatchedFace.fastMatch) return fastMatchedFace;
  return {
    ...fastMatchedFace,
    match: fastMatchedFace.fastMatch,
  };
}

function getBestTargetMatchForEmbedding(
  embedding,
  getTargetEmbedding,
  { includeSourceExpansions = true } = {},
) {
  if (!Array.isArray(embedding) || targetFaces.length === 0) return null;
  const probeEmbedding = normalizeEmbeddingVector(embedding);
  if (!probeEmbedding) return null;

  const matches = createIdentityProfiles(getTargetEmbedding, { includeSourceExpansions })
    .map((profile) => {
      const similarity = getIdentityProfileSimilarity(probeEmbedding, profile);
      if (!Number.isFinite(similarity)) return null;
      return {
        target: profile.target,
        identityKey: profile.identityKey,
        similarity,
        distance: Math.sqrt(Math.max(0, 2 - 2 * similarity)),
        gallerySampleCount: profile.sampleCount,
        rejectedEnrollmentCount: profile.rejectedCount,
        sourceExpandedSampleCount: profile.sourceExpandedSampleCount || 0,
        sourceExpandedPoseCount: profile.sourceExpandedPoseCount || 0,
        metric: "cosine",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.similarity - a.similarity);
  const bestMatch = matches[0] || null;
  if (!bestMatch) return null;

  const secondIdentityMatch = matches[1] || null;
  return {
    ...bestMatch,
    secondSimilarity: secondIdentityMatch?.similarity ?? null,
    secondTarget: secondIdentityMatch?.target || null,
    margin: Number.isFinite(secondIdentityMatch?.similarity)
      ? bestMatch.similarity - secondIdentityMatch.similarity
      : null,
  };
}

function getIdentityProfileSimilarity(probeEmbedding, profile) {
  const sourceExpandedEmbeddings = Array.isArray(profile.sourceExpandedEmbeddings)
    ? profile.sourceExpandedEmbeddings
    : [];
  const similarities = [profile.embedding, ...sourceExpandedEmbeddings]
    .map((embedding) => getEmbeddingSimilarity(probeEmbedding, embedding))
    .filter(Number.isFinite);
  return similarities.length > 0 ? Math.max(...similarities) : null;
}

function createIdentityProfiles(
  getTargetEmbedding,
  { includeSourceExpansions = true } = {},
) {
  const groups = new Map();
  targetFaces.forEach((target) => {
    const embedding = normalizeEmbeddingVector(getTargetEmbedding(target));
    if (!embedding) return;
    const identityKey = getTargetIdentityKey(target);
    const samples = groups.get(identityKey) || [];
    samples.push({ target, embedding });
    groups.set(identityKey, samples);
  });

  const profiles = Array.from(
    groups,
    ([identityKey, samples]) => createIdentityProfile(identityKey, samples),
  ).filter(Boolean);
  if (!includeSourceExpansions || getTargetEmbedding !== getTargetAccurateEmbedding) {
    return profiles;
  }

  return profiles.map((profile) => {
    const expansion = sourceIdentityExpansions.get(profile.identityKey);
    if (!expansion) return profile;
    return {
      ...profile,
      sourceExpandedEmbeddings: expansion.embeddings,
      sourceExpandedSampleCount: expansion.sampleKeys.length,
      sourceExpandedPoseCount: expansion.embeddings.length,
    };
  });
}

function createIdentityProfile(identityKey, samples) {
  if (samples.length === 0) return null;
  const medoid = samples
    .map((sample) => ({
      ...sample,
      agreement: samples.length === 1
        ? 1
        : samples.reduce((sum, peer) => (
          peer === sample ? sum : sum + (getEmbeddingSimilarity(sample.embedding, peer.embedding) ?? -1)
        ), 0) / (samples.length - 1),
    }))
    .sort((first, second) => second.agreement - first.agreement)[0];
  const acceptedSamples = samples.filter((sample) => (
    sample === medoid
    || getEmbeddingSimilarity(sample.embedding, medoid.embedding) >= ENROLLMENT_CONSISTENCY_COSINE
  ));
  const embedding = averageTargetEmbeddings(acceptedSamples);
  if (!embedding) return null;

  return {
    identityKey,
    target: medoid.target,
    embedding,
    sampleCount: acceptedSamples.length,
    rejectedCount: samples.length - acceptedSamples.length,
    allowsWeakSourceConsensus: acceptedSamples.every(({ target }) => (
      isLowResolutionTargetReference(target)
    )),
  };
}

function isLowResolutionTargetReference(target) {
  if (target?.quality?.level) return target.quality.level === "low";

  const width = Number(target?.width);
  const height = Number(target?.height);
  return (
    Number.isFinite(width)
    && Number.isFinite(height)
    && width >= MIN_MATCH_FACE_SIZE_PX
    && height >= MIN_MATCH_FACE_SIZE_PX
    && (width < GOOD_MATCH_FACE_SIZE_PX || height < GOOD_MATCH_FACE_SIZE_PX)
  );
}

function clearSourceIdentityExpansions() {
  sourceIdentityExpansions = new Map();
  sourceIdentityExpansionSignature = "";
}

function updateSourceIdentityExpansions(samples) {
  const nextExpansions = buildSourceIdentityExpansions(samples);
  const nextSignature = createSourceIdentityExpansionSignature(nextExpansions);
  if (nextSignature === sourceIdentityExpansionSignature) return false;

  sourceIdentityExpansions = nextExpansions;
  sourceIdentityExpansionSignature = nextSignature;
  return true;
}

function buildSourceIdentityExpansions(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return new Map();

  const trackingCandidates = Array.from(
    new Map(samples.map((sample) => [sample.key, sample])).values(),
  );
  const reliableCandidates = trackingCandidates.filter((candidate) => (
    candidate.detectionProbability >= MIN_MATCH_DETECTION_PROBABILITY
  ));
  const baseProfiles = createIdentityProfiles(
    getTargetAccurateEmbedding,
    { includeSourceExpansions: false },
  );
  const proposedExpansions = new Map();

  baseProfiles.forEach((profile) => {
    const ordinaryBaseSamples = resolveSourceIdentitySampleCollisions(
      expandSourceIdentityProfile(profile, reliableCandidates),
      profile.embedding,
    );
    const weakConsensusSamples = ordinaryBaseSamples.length < 2
      ? findWeakSourceIdentityConsensus(profile, reliableCandidates)
      : [];
    const baseSamples = weakConsensusSamples.length
      >= SOURCE_IDENTITY_WEAK_MIN_INDEPENDENT_SAMPLES
      ? weakConsensusSamples
      : ordinaryBaseSamples;
    if (baseSamples.length < 2) return;
    const trackingOrigins = createSourceIdentityTrackingOrigins(
      profile,
      baseSamples,
      trackingCandidates,
    );
    const poseSampleGroups = expandSourceIdentityThroughTrackedPoses(
      baseSamples,
      trackingOrigins,
      reliableCandidates,
      trackingCandidates,
    );
    const poseProfiles = poseSampleGroups
      .map((poseSamples) => ({
        embedding: averageSourceIdentityEmbeddings(poseSamples),
        sampleKeys: poseSamples.map((sample) => sample.key).sort(),
      }))
      .filter((poseProfile) => Array.isArray(poseProfile.embedding));
    if (poseProfiles.length === 0) return;
    const sampleKeys = Array.from(new Set(
      poseProfiles.flatMap((poseProfile) => poseProfile.sampleKeys),
    )).sort();
    proposedExpansions.set(profile.identityKey, {
      embeddings: poseProfiles.map((poseProfile) => poseProfile.embedding),
      poseSampleKeys: poseProfiles.map((poseProfile) => poseProfile.sampleKeys),
      sampleKeys,
    });
  });

  const ownersBySample = new Map();
  proposedExpansions.forEach((expansion, identityKey) => {
    expansion.sampleKeys.forEach((sampleKey) => {
      const owners = ownersBySample.get(sampleKey) || [];
      owners.push(identityKey);
      ownersBySample.set(sampleKey, owners);
    });
  });
  const conflictedIdentities = new Set();
  ownersBySample.forEach((owners) => {
    if (owners.length < 2) return;
    owners.forEach((identityKey) => conflictedIdentities.add(identityKey));
  });

  return new Map(
    Array.from(proposedExpansions)
      .filter(([identityKey]) => !conflictedIdentities.has(identityKey)),
  );
}

function expandSourceIdentityProfile(profile, candidates) {
  const accepted = [{
    key: `gallery:${profile.identityKey}`,
    sourceKey: `gallery:${profile.identityKey}`,
    embedding: profile.embedding,
    embeddingNorm: null,
  }];
  const acceptedKeys = new Set();

  candidates.forEach((candidate) => {
    const similarity = getEmbeddingSimilarity(profile.embedding, candidate.embedding);
    if (similarity < SOURCE_IDENTITY_BOOTSTRAP_COSINE) return;
    accepted.push(candidate);
    acceptedKeys.add(candidate.key);
  });

  let addedAnotherPose = true;
  while (addedAnotherPose) {
    addedAnotherPose = false;
    const additions = [];

    candidates.forEach((candidate) => {
      if (acceptedKeys.has(candidate.key)) return;
      const strongestBySource = new Map();
      accepted.forEach((support) => {
        const similarity = getEmbeddingSimilarity(candidate.embedding, support.embedding);
        const previous = strongestBySource.get(support.sourceKey);
        if (!Number.isFinite(previous) || similarity > previous) {
          strongestBySource.set(support.sourceKey, similarity);
        }
      });
      const supportScores = Array.from(strongestBySource.values())
        .filter(Number.isFinite)
        .sort((first, second) => second - first);
      if (
        supportScores[0] >= SOURCE_IDENTITY_BRIDGE_COSINE
        && supportScores[1] >= SOURCE_IDENTITY_SUPPORT_COSINE
      ) {
        additions.push(candidate);
      }
    });

    additions.forEach((candidate) => {
      accepted.push(candidate);
      acceptedKeys.add(candidate.key);
      addedAnotherPose = true;
    });
  }

  return accepted.slice(1);
}

function findWeakSourceIdentityConsensus(profile, candidates) {
  if (!profile.allowsWeakSourceConsensus) return [];

  const weakCandidates = resolveSourceIdentitySampleCollisions(
    candidates.filter((candidate) => (
      getEmbeddingSimilarity(profile.embedding, candidate.embedding)
        >= SOURCE_IDENTITY_WEAK_BOOTSTRAP_COSINE
    )),
    profile.embedding,
  ).sort((first, second) => (
    getEmbeddingSimilarity(profile.embedding, second.embedding)
      - getEmbeddingSimilarity(profile.embedding, first.embedding)
  ));
  if (weakCandidates.length < SOURCE_IDENTITY_WEAK_MIN_INDEPENDENT_SAMPLES) return [];

  // Anchor the consensus to the source face closest to the gallery. Requiring
  // every additional face to agree with every previously accepted face keeps
  // a repeated lookalike cluster from hijacking a weak reference.
  const consensus = [weakCandidates[0]];
  weakCandidates.slice(1).forEach((candidate) => {
    const agreesWithConsensus = consensus.every((support) => (
      getEmbeddingSimilarity(candidate.embedding, support.embedding)
        >= SOURCE_IDENTITY_WEAK_CONSENSUS_COSINE
    ));
    if (agreesWithConsensus) consensus.push(candidate);
  });

  return consensus.length >= SOURCE_IDENTITY_WEAK_MIN_INDEPENDENT_SAMPLES
    ? consensus
    : [];
}

function createSourceIdentityTrackingOrigins(profile, baseSamples, trackingCandidates) {
  const originsByKey = new Map(baseSamples.map((sample) => [sample.key, sample]));
  trackingCandidates.forEach((candidate) => {
    if (
      originsByKey.has(candidate.key)
      || candidate.detectionProbability >= MIN_MATCH_DETECTION_PROBABILITY
    ) {
      return;
    }
    const similarity = getEmbeddingSimilarity(profile.embedding, candidate.embedding);
    if (similarity >= SOURCE_IDENTITY_BOOTSTRAP_COSINE) {
      originsByKey.set(candidate.key, candidate);
    }
  });
  return Array.from(originsByKey.values());
}

function expandSourceIdentityThroughTrackedPoses(
  baseSamples,
  trackingOrigins,
  reliableCandidates,
  trackingCandidates,
) {
  const trackedSeeds = findSourceIdentityTrackedSeeds(trackingOrigins, trackingCandidates);
  if (trackedSeeds.length < SOURCE_IDENTITY_TRACK_MIN_INDEPENDENT_SEEDS) {
    return [baseSamples];
  }

  const trackedExpansions = trackedSeeds.map((trackedSeed) => {
    const samples = expandSourceIdentityProfile({
      identityKey: `tracked:${trackedSeed.candidate.key}`,
      embedding: trackedSeed.candidate.embedding,
    }, reliableCandidates);
    return {
      ...trackedSeed,
      samples,
      sampleKeys: new Set(samples.map((sample) => sample.key)),
    };
  });
  const validatedExpansions = trackedExpansions.filter((expansion) => {
    const supportingTracks = trackedSeeds.filter((trackedSeed) => (
      expansion.sampleKeys.has(trackedSeed.candidate.key)
    ));
    const candidateSources = new Set(
      supportingTracks.map((trackedSeed) => trackedSeed.candidate.sourceKey),
    );
    const originSources = new Set(
      supportingTracks.map((trackedSeed) => trackedSeed.support.sourceKey),
    );
    return (
      candidateSources.size >= SOURCE_IDENTITY_TRACK_MIN_INDEPENDENT_SEEDS
      && originSources.size >= SOURCE_IDENTITY_TRACK_MIN_INDEPENDENT_SEEDS
    );
  }).filter((expansion) => (
    expansion.samples.length >= 2
    && !hasSourceIdentitySampleCollision(expansion.samples)
  ));
  if (validatedExpansions.length === 0) return [baseSamples];

  const uniqueExpansions = Array.from(new Map(
    validatedExpansions.map((expansion) => [
      Array.from(expansion.sampleKeys).sort().join("|"),
      expansion,
    ]),
  ).values());
  const poseSampleGroups = [baseSamples];
  let acceptedSamples = getUniqueSourceIdentitySamples(baseSamples);

  uniqueExpansions.forEach((expansion) => {
    const newSamples = expansion.samples.filter((sample) => (
      !acceptedSamples.some((acceptedSample) => acceptedSample.key === sample.key)
    ));
    if (newSamples.length === 0) return;
    const proposedSamples = getUniqueSourceIdentitySamples([
      ...acceptedSamples,
      ...expansion.samples,
    ]);
    if (hasSourceIdentitySampleCollision(proposedSamples)) return;
    poseSampleGroups.push(expansion.samples);
    acceptedSamples = proposedSamples;
  });

  return poseSampleGroups;
}

function findSourceIdentityTrackedSeeds(trackingOrigins, candidates) {
  const originKeys = new Set(trackingOrigins.map((sample) => sample.key));
  const candidatesBySource = new Map();
  candidates.forEach((candidate) => {
    const sourceCandidates = candidatesBySource.get(candidate.sourceKey) || [];
    sourceCandidates.push(candidate);
    candidatesBySource.set(candidate.sourceKey, sourceCandidates);
  });
  const trackedSeeds = new Map();

  trackingOrigins.forEach((support) => {
    if (!hasSourceIdentityTrackingGeometry(support)) return;
    candidates.forEach((candidate) => {
      if (
        originKeys.has(candidate.key)
        || !hasSourceIdentityTrackingGeometry(candidate)
        || candidate.detectionProbability < MIN_MATCH_DETECTION_PROBABILITY
        || candidate.sequenceGroup !== support.sequenceGroup
        || Math.abs(candidate.sequenceIndex - support.sequenceIndex) !== 1
      ) {
        return;
      }

      const similarity = getEmbeddingSimilarity(candidate.embedding, support.embedding);
      const centerDistance = getSourceIdentityCenterDistance(candidate, support);
      const sizeRatio = getSourceIdentitySizeRatio(candidate, support);
      if (
        similarity < SOURCE_IDENTITY_TRACK_MIN_COSINE
        || centerDistance > SOURCE_IDENTITY_TRACK_MAX_CENTER_DISTANCE
        || sizeRatio > SOURCE_IDENTITY_TRACK_MAX_SIZE_RATIO
      ) {
        return;
      }

      const candidateSourceFaces = candidatesBySource.get(candidate.sourceKey) || [];
      const supportSourceFaces = candidatesBySource.get(support.sourceKey) || [];
      const nearestToSupport = getNearestSourceIdentityFace(support, candidateSourceFaces);
      const nearestToCandidate = getNearestSourceIdentityFace(candidate, supportSourceFaces);
      if (nearestToSupport?.key !== candidate.key || nearestToCandidate?.key !== support.key) {
        return;
      }

      trackedSeeds.set(candidate.key, { candidate, support });
    });
  });

  return Array.from(trackedSeeds.values());
}

function getUniqueSourceIdentitySamples(samples) {
  return Array.from(new Map(
    samples.map((sample) => [sample.key, sample]),
  ).values());
}

function resolveSourceIdentitySampleCollisions(samples, referenceEmbedding) {
  const sampleBySource = new Map();
  getUniqueSourceIdentitySamples(samples).forEach((sample) => {
    const previous = sampleBySource.get(sample.sourceKey);
    if (!previous) {
      sampleBySource.set(sample.sourceKey, sample);
      return;
    }
    const previousSimilarity = getEmbeddingSimilarity(
      previous.embedding,
      referenceEmbedding,
    );
    const sampleSimilarity = getEmbeddingSimilarity(
      sample.embedding,
      referenceEmbedding,
    );
    if (sampleSimilarity > previousSimilarity) {
      sampleBySource.set(sample.sourceKey, sample);
    }
  });
  return Array.from(sampleBySource.values());
}

function hasSourceIdentitySampleCollision(samples) {
  const sampleBySource = new Map();
  return getUniqueSourceIdentitySamples(samples).some((sample) => {
    const previousKey = sampleBySource.get(sample.sourceKey);
    if (previousKey && previousKey !== sample.key) return true;
    sampleBySource.set(sample.sourceKey, sample.key);
    return false;
  });
}

function hasSourceIdentityTrackingGeometry(sample) {
  return (
    typeof sample?.sequenceGroup === "string"
    && Number.isSafeInteger(sample.sequenceIndex)
    && Number.isFinite(sample.centerX)
    && Number.isFinite(sample.centerY)
    && Number.isFinite(sample.widthRatio)
    && sample.widthRatio > 0
    && Number.isFinite(sample.heightRatio)
    && sample.heightRatio > 0
  );
}

function getSourceIdentityCenterDistance(first, second) {
  return Math.hypot(first.centerX - second.centerX, first.centerY - second.centerY);
}

function getSourceIdentitySizeRatio(first, second) {
  return Math.max(
    first.widthRatio / second.widthRatio,
    second.widthRatio / first.widthRatio,
    first.heightRatio / second.heightRatio,
    second.heightRatio / first.heightRatio,
  );
}

function getNearestSourceIdentityFace(sample, candidates) {
  return candidates
    .filter(hasSourceIdentityTrackingGeometry)
    .map((candidate) => ({
      candidate,
      distance: getSourceIdentityCenterDistance(sample, candidate),
    }))
    .sort((first, second) => first.distance - second.distance)[0]?.candidate || null;
}

function averageSourceIdentityEmbeddings(samples) {
  if (samples.length === 0) return null;
  const totals = new Array(samples[0].embedding.length).fill(0);
  let totalWeight = 0;

  samples.forEach((sample) => {
    const featureNorm = Number(sample.embeddingNorm);
    const weight = Number.isFinite(featureNorm) && featureNorm > 0 ? featureNorm : 1;
    sample.embedding.forEach((value, index) => {
      totals[index] += value * weight;
    });
    totalWeight += weight;
  });

  return totalWeight > 0
    ? normalizeEmbeddingVector(totals.map((value) => value / totalWeight))
    : null;
}

function createSourceIdentityExpansionSignature(expansions) {
  if (expansions.size === 0) return "";
  return JSON.stringify(
    Array.from(expansions, ([identityKey, expansion]) => [
      identityKey,
      expansion.poseSampleKeys,
    ]).sort(([first], [second]) => first.localeCompare(second)),
  );
}

function averageTargetEmbeddings(samples) {
  if (samples.length === 0) return null;
  const totals = new Array(samples[0].embedding.length).fill(0);
  let totalWeight = 0;
  samples.forEach(({ target, embedding }) => {
    const featureNorm = Number(target?.embeddingNorm ?? target?.embedding_norm);
    const weight = Number.isFinite(featureNorm) && featureNorm > 0 ? featureNorm : 1;
    embedding.forEach((value, index) => {
      totals[index] += value * weight;
    });
    totalWeight += weight;
  });
  if (totalWeight <= 0) return null;
  return normalizeEmbeddingVector(totals.map((value) => value / totalWeight));
}

function normalizeEmbeddingVector(embedding) {
  if (!Array.isArray(embedding) || embedding.length === 0) return null;
  const values = embedding.map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm <= 0) return null;
  return values.map((value) => value / norm);
}

function getTargetIdentityKey(target) {
  return String(target?.identityId || target?.id || "").trim();
}

function getFaceAccurateEmbedding(face) {
  if (Array.isArray(face?.accurateEmbedding)) return face.accurateEmbedding;
  if (Array.isArray(face?.fastEmbedding)) return null;
  return Array.isArray(face?.embedding) ? face.embedding : null;
}

function getFaceFastEmbedding(face) {
  if (Array.isArray(face?.fastEmbedding)) return face.fastEmbedding;
  if (Array.isArray(face?.accurateEmbedding)) return null;
  return Array.isArray(face?.embedding) ? face.embedding : null;
}

function getTargetAccurateEmbedding(target) {
  return Array.isArray(target?.accurateEmbedding) ? target.accurateEmbedding : null;
}

function getTargetFastEmbedding(target) {
  if (Array.isArray(target?.fastEmbedding)) return target.fastEmbedding;
  if (!Array.isArray(target?.accurateEmbedding) && Array.isArray(target?.embedding)) {
    return target.embedding;
  }
  return null;
}

function hasTargetEmbedding(target) {
  return Array.isArray(getTargetFastEmbedding(target)) || Array.isArray(getTargetAccurateEmbedding(target));
}

function createDetectionSummary(faces) {
  const matchCount = faces.filter((face) => face.match?.isMatch).length;
  const faceText = `${faces.length} face${faces.length === 1 ? "" : "s"} detected`;
  if (!hasSearchableTargets()) return faceText;
  return `${faceText} · ${matchCount} target match${matchCount === 1 ? "" : "es"}`;
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
  const embeddingSimilarity = getEmbeddingSimilarity(getTrackingEmbedding(face), track.embedding);
  const embeddingMatches = embeddingSimilarity !== null
    && embeddingSimilarity >= TRACK_MIN_EMBEDDING_SIMILARITY;

  if (!sameTarget && !embeddingMatches && overlap < TRACK_MIN_IOU) return null;
  return (sameTarget ? 4 : 0) + overlap + Math.max(-1, embeddingSimilarity || 0) * 2;
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
  if (Array.isArray(getTrackingEmbedding(face))) track.embedding = getTrackingEmbedding(face);
  if (match) {
    track.name = match.target.name || getTargetLabel(match.target);
    track.targetId = match.target.id;
  }

  face.track = { id: track.id };
}

function getTrackingEmbedding(face) {
  return getFaceAccurateEmbedding(face) || getFaceFastEmbedding(face);
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

  const render = (mediaTime) => {
    const playbackTime = Number.isFinite(mediaTime) ? mediaTime : video.currentTime;
    drawVideoOverlay(overlay, samples, playbackTime, sampleInterval);
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

  return render;
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
  };
}

function createVideoSummary(samples, tracks, sampleInterval) {
  const detections = samples.reduce((total, sample) => total + sample.faces.length, 0);
  const namedTracks = tracks.filter((track) => track.name).length;
  const fps = formatFps(1 / sampleInterval);
  const named = namedTracks > 0 ? ` · ${namedTracks} named` : "";
  return `${tracks.length} face track${tracks.length === 1 ? "" : "s"} · ${detections} detections · ${fps} fps${named}`;
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
  return targetFaces.some(hasTargetEmbedding);
}

function syncMatchFilter() {
  updateResultCount();
  redrawDetectionOverlays();
}

function setResultState(node, state) {
  node.article.dataset.resultState = state;
  node.article.classList.toggle("targetMatch", state === "match");
  if (node.article.isConnected) {
    updateResultCount();
  } else if (uploadInProgress) {
    updateDetectionProgress();
  }
}

function updateResultCount() {
  const items = Array.from(results.querySelectorAll(".result"));
  const filterMatches = isTargetMatchesOnlyActive();
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

  updateResultsEmptyCopy(filterMatches);
  resultsEmpty.hidden = !(
    detectionResultsHaveRun
    && !uploadInProgress
    && (
      items.length === 0
      || (
        filterMatches
        && pendingCount === 0
        && matchCount === 0
      )
    )
  );
  updateSelectedDownloadButton();
}

function updateResultsEmptyCopy(filterMatches) {
  const title = resultsEmpty.querySelector("h3");
  const detail = resultsEmpty.querySelector("p");
  if (!title || !detail) return;

  if (filterMatches) {
    title.textContent = "No target matches found";
    detail.textContent = "No scanned images contained a saved target face.";
  } else {
    title.textContent = "No faces found";
    detail.textContent = "Try another source with clearer face images.";
  }
}

function isTargetMatchesOnlyActive() {
  return hasSearchableTargets();
}

function redrawDetectionOverlays() {
  results.querySelectorAll(".result").forEach((article) => {
    const node = article.fdxResultNode;
    if (!node) return;

    if (node.imageAnalysis) {
      drawImage(node.canvas, node.imageAnalysis.image);
    }

    if (typeof node.renderVideoOverlay === "function") {
      node.renderVideoOverlay();
    }
  });
}

function drawImage(canvas, image) {
  const maxWidth = 920;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);
}

function drawVideoOverlay(canvas, samples = [], playbackTime = 0, sampleInterval = VIDEO_FRAME_INTERVAL_SECONDS) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  const sample = getVideoSampleForTime(samples, playbackTime, sampleInterval);
  if (!sample || canvas.width <= 0 || canvas.height <= 0) return;

  context.lineWidth = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) / 360));
  context.font = "bold 13px 'JetBrains Mono', monospace";

  sample.faces.forEach((face) => {
    const box = face.box || {};
    const xMin = clamp(Number(box.x_min || 0), 0, canvas.width);
    const yMin = clamp(Number(box.y_min || 0), 0, canvas.height);
    const xMax = clamp(Number(box.x_max || 0), xMin, canvas.width);
    const yMax = clamp(Number(box.y_max || 0), yMin, canvas.height);
    const width = xMax - xMin;
    const height = yMax - yMin;
    if (width < 1 || height < 1) return;

    const color = face.match?.isMatch ? MATCH_BOX_COLOR : FACE_BOX_COLOR;
    const label = createBoxLabel(face, { includeConfidence: true });
    drawReticle(context, xMin, yMin, width, height, color);
    if (label) drawCanvasLabel(context, label, xMin, yMin, color, 20);
  });

  context.shadowBlur = 0;
}

function getVideoSampleForTime(samples, playbackTime, sampleInterval) {
  if (!Array.isArray(samples) || samples.length === 0) return null;

  const time = Math.max(0, Number(playbackTime) || 0);
  let low = 0;
  let high = samples.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const timestamp = Number(samples[middle]?.timestamp) || 0;
    if (timestamp < time) low = middle + 1;
    else if (timestamp > time) high = middle - 1;
    else return samples[middle];
  }

  const candidates = [samples[high], samples[low]].filter(Boolean);
  const closest = candidates.reduce((best, candidate) => (
    Math.abs(Number(candidate.timestamp) - time) < Math.abs(Number(best.timestamp) - time)
      ? candidate
      : best
  ));
  const maximumDistance = Math.max(Number(sampleInterval) * 0.75, 1 / 120);
  return Math.abs(Number(closest.timestamp) - time) <= maximumDistance ? closest : null;
}

function createBoxLabel(face, options = {}) {
  const { includeConfidence = false } = options;
  const match = face.match;
  const parts = [];

  if (match?.isMatch) {
    parts.push(match.target.name || getTargetLabel(match.target));
  } else if (face.track?.name) {
    parts.push(face.track.name);
  } else if (face.track?.id) {
    parts.push(`Face ${face.track.id}`);
  }

  if (includeConfidence) {
    parts.push(`${Math.round(Number(face.box?.probability || 0) * 100)}%`);
  }

  return parts.filter(Boolean).join(" · ");
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
  context.fillStyle = LABEL_TEXT_COLOR;
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

    const stream = await openCameraStream();
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
    scanIdle.querySelector("strong").textContent = "Camera access needed";
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
  scanIdle.querySelector("strong").textContent = "Camera stopped";
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
    return "Camera permission was blocked. Allow it in your browser settings, then try again.";
  }
  if (error?.name === "NotFoundError") {
    return "No camera was found on this device.";
  }
  if (error?.name === "NotReadableError") {
    return "The camera is already in use by another application.";
  }
  return error?.message || "Could not open the camera.";
}

async function openCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: CAMERA_IDEAL_FPS, max: CAMERA_IDEAL_FPS },
      },
      audio: false,
    });
  } catch (error) {
    if (!isConstraintCameraError(error)) throw error;
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

function isConstraintCameraError(error) {
  return error?.name === "OverconstrainedError" || error?.name === "ConstraintNotSatisfiedError";
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
    await ensureDetectorModelsReady();
    const blob = await captureScanFrame();
    const url = `/api/accurate/find_faces?face_plugins=${encodeURIComponent(FACE_MATCH_PLUGINS)}&limit=0&det_prob_threshold=${DEFAULT_DETECTION_THRESHOLD}`;
    const data = new FormData();
    data.append("file", blob, "scan.jpg");

    request = new AbortController();
    liveScanRequest = request;
    const { response, payload } = await fetchDetectorJson(url, {
      method: "POST",
      body: data,
      signal: request.signal,
    });
    const noFaceFound = response.status === 400 && /no face/i.test(payload.message || "");
    if (!response.ok && !noFaceFound) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }
    if (generation !== liveScanGeneration) return;
    if (!noFaceFound) {
      validateDetectorResponseModels(payload, FACE_MATCH_PLUGINS);
    }

    const faces = noFaceFound || !Array.isArray(payload.result)
      ? []
      : payload.result.map(normalizeAccurateDetectionFace);
    const matchedFaces = faces.map(addRealtimeTargetMatch);
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
    const color = hasMatch ? MATCH_BOX_COLOR : FACE_BOX_COLOR;
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
    color: SCAN_VISUALIZER_COLOR,
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
    color: SCAN_VISUALIZER_COLOR,
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
renderDetectionFolderPath();
detectionFolderRestorePromise = restoreStoredDetectionFolderHandle()
  .finally(() => {
    detectionFolderRestorePromise = null;
  });
updateResultCount();
renderTargetFaces();
checkBackend();
setInterval(checkBackend, 5000);
window.addEventListener("pagehide", releaseScanCamera);
window.addEventListener("pagehide", releaseFaceCaptureCamera);
