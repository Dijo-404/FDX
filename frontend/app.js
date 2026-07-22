const fileInput = document.querySelector("#fileInput");
const folderInput = document.querySelector("#folderInput");
const detectionUploadButton = document.querySelector("#detectionUploadButton");
const startDetectionButton = document.querySelector("#startDetectionButton");
const targetFileInput = document.querySelector("#targetFileInput");
const targetAddButton = document.querySelector("#targetAddButton");
const targetDropzone = document.querySelector("#targetDropzone");
const targetDrawPanel = document.querySelector("#targetDrawPanel");
const targetDrawCanvas = document.querySelector("#targetDrawCanvas");
const targetDrawStatus = document.querySelector("#targetDrawStatus");
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
const MIN_MATCH_DETECTION_PROBABILITY = 0.80;
const MIN_MATCH_FACE_SIZE_PX = 40;
const GOOD_MATCH_FACE_SIZE_PX = 80;
const MIN_TARGET_SELECTION_SIZE_PX = 24;
const TARGET_CROP_PADDING = 0.30;
const DETECTION_FOLDER_STORAGE_KEY = "fdx.detectionFolder";
const DETECTION_FOLDER_DB_NAME = "fdx.detectionFolderHandles";
const DETECTION_FOLDER_STORE_NAME = "handles";
const DETECTION_FOLDER_HANDLE_KEY = "current";
const DETECTION_CACHE_DB_NAME = "fdx.detectionCache";
const DETECTION_CACHE_STORE_NAME = "analyses";
const DETECTION_CACHE_INDEX_NAME = "cachedAt";
const DETECTION_CACHE_VERSION = 5;
const DETECTION_CACHE_MAX_ENTRIES = 200;
const DETECTION_CACHE_FULL_HASH_MAX_BYTES = 8 * 1024 * 1024;
const DETECTION_CACHE_SAMPLE_BYTES = 64 * 1024;
const TARGET_STORAGE_KEY = "fdx.targetFaces.adafaceIr101Ms1mv2.v1";
const FACE_DETECTION_PLUGINS = "";
const FACE_MATCH_PLUGINS = "calculator";
const BACKEND_ACCURATE = "accurate";
const BACKEND_FAST = "fast";
const MATCH_CANDIDATE_LIMIT = 12;
const MATCH_CANDIDATE_PADDING = 0.35;
const FAST_PREFILTER_SIMILARITY_THRESHOLD = 0.40;
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
let detectionResultsHaveRun = false;
let faceCaptureStream = null;
let faceCaptureStartPromise = null;
let faceCaptureAddInProgress = false;
let latestFaceCaptureIds = [];
let targetDrawState = null;
let resultImagePreviewOpener = null;
const detectionFileFingerprintPromises = new WeakMap();
const detectionMemoryCache = new Map();
let detectionCacheDbPromise = null;

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
  const removedTargetIds = new Set(targetFaces.map((face) => face.id));
  targetFaces.splice(0, targetFaces.length);
  refreshCachedTargetMatches(removedTargetIds);
  renderTargetFaces();
});

fileInput.addEventListener("change", () => {
  void handleFileInputSelection(fileInput.files);
});

folderInput.addEventListener("change", () => {
  void handleFolderInputSelection(folderInput.files);
});

detectionUploadButton.addEventListener("click", () => {
  void openDetectionSourcePicker();
});

startDetectionButton.addEventListener("click", () => {
  if (uploadInProgress) {
    void stopDetectionUpload();
    return;
  }
  void startDetectionFromCurrentSource();
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
    const { response } = await fetchDetectorJson("/health");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    statusText.textContent = "Detector ready";
    statusDot.classList.add("ready");
  } catch (error) {
    statusText.textContent = "Detector is starting";
    statusDot.classList.remove("ready");
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

async function openDetectionSourcePicker() {
  if (supportsDirectoryPicker()) {
    await openDetectionFolderPicker();
    return;
  }

  if ("webkitdirectory" in folderInput) {
    folderInput.click();
    return;
  }

  fileInput.click();
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
      batchProgress.textContent = "No image files in selected folder";
      return;
    }

    await replaceDetectionResults(files);
  } catch (error) {
    showDetectionFolderError(error);
  }
}

async function handleFileInputSelection(fileList) {
  const files = Array.from(fileList).filter(isProcessableDetectionFile);
  fileInput.value = "";
  if (files.length === 0) return;

  clearDetectionFolderMeta();
  setCurrentDetectionSource({
    type: "files",
    files,
    label: `${files.length} selected file${files.length === 1 ? "" : "s"}`,
  });
  void deleteStoredDetectionFolderHandle();
  await handleFiles(files);
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
    batchProgress.textContent = "No image files in selected folder";
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
    || file.type.startsWith("video/")
    || /\.(avif|bmp|gif|heic|heif|jpe?g|m4v|mov|mp4|png|webm|webp)$/i.test(file.name);
}

function isFolderDetectionFile(file) {
  return file.type.startsWith("image/")
    || /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name);
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
  currentDetectionSource = source;
  renderDetectionFolderPath();
}

function clearDetectionFolderMeta() {
  detectionFolderMeta = null;
  localStorage.removeItem(DETECTION_FOLDER_STORAGE_KEY);
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
  const sourceType = currentDetectionSource?.type || detectionFolderMeta?.source;

  if (sourceLabel) {
    const prefix = sourceType === "files" ? "Batch" : "Folder";
    detectionUploadButton.textContent = `${prefix}: ${sourceLabel}`;
    detectionUploadButton.title = "Choose another file batch or folder";
  } else {
    detectionUploadButton.textContent = "Choose source";
    detectionUploadButton.title = "Choose files or a folder";
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
    const request = indexedDB.open(DETECTION_CACHE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(DETECTION_CACHE_STORE_NAME)
        ? request.transaction.objectStore(DETECTION_CACHE_STORE_NAME)
        : database.createObjectStore(DETECTION_CACHE_STORE_NAME, { keyPath: "key" });
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
  const cacheKey = await createDetectionCacheKey(file, kind, options);
  throwIfDetectionAborted(signal);
  const cached = await readDetectionCacheEntry(cacheKey);
  throwIfDetectionAborted(signal);

  if (cached?.kind === kind && Array.isArray(cached.faces)) {
    return { faces: cached.faces, cacheHit: true, cacheKey };
  }

  const payload = await findFaces(
    file,
    options.facePlugins,
    true,
    options.backend,
    options.threshold,
    signal,
  );
  const faces = Array.isArray(payload.result) ? payload.result : [];
  await writeDetectionCacheEntry(cacheKey, { kind, faces });
  return { faces, cacheHit: false, cacheKey };
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter(isProcessableDetectionFile);
  fileInput.value = "";
  folderInput.value = "";
  if (files.length === 0) return detectionUploadPromise || Promise.resolve();

  const generation = processingGeneration;
  const nodes = files.map((file) => ({ file, node: createResultNode(file) }));

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
      const state = file.type.startsWith("video/")
        ? await detectVideo(file, node, generation, abortController.signal)
        : await detectFile(file, node, abortController.signal);

      if (generation !== processingGeneration) break;
      setResultState(node, state);
      if (node.cacheHit) detectionUploadCacheHitCount += 1;
      detectionUploadProcessedCount += 1;
      updateDetectionProgress();
    }
  } finally {
    const processedCount = detectionUploadProcessedCount;
    const totalCount = detectionUploadTotalCount;
    const cacheHitCount = detectionUploadCacheHitCount;
    let visibleResultCount = 0;

    if (generation === processingGeneration) {
      visibleResultCount = revealCompletedDetectionResults();
      detectionResultsHaveRun = true;
    } else {
      releaseDetectionResultNodes(detectionUploadResultNodes);
    }

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

function revealCompletedDetectionResults() {
  const fragment = document.createDocumentFragment();
  const visibleNodes = [];

  detectionUploadResultNodes.forEach((node) => {
    if (shouldShowCompletedDetectionResult(node)) {
      visibleNodes.push(node);
      fragment.append(node.article);
    } else {
      releaseDetectionResultNode(node);
    }
  });

  if (visibleNodes.length > 0) {
    results.prepend(fragment);
  }

  return visibleNodes.length;
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

function releaseDetectionResultNodes(nodes) {
  nodes.forEach(releaseDetectionResultNode);
}

function releaseDetectionResultNode(node) {
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
      batchProgress.textContent = "No image files in selected folder";
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
  releaseDetectionResultNodes(detectionUploadResultNodes);
  detectionUploadResultNodes = [];
  detectionUploadProcessedCount = 0;
  detectionUploadTotalCount = 0;
  detectionUploadCacheHitCount = 0;
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
  resultCount.textContent = "Detection in progress";
  detectionProgress.hidden = false;
  detectionProgressBar.max = total || 1;
  detectionProgressBar.value = processed;
  detectionProgressText.textContent = `${processed} of ${total} images processed`;
}

function hideDetectionProgress() {
  detectionProgress.hidden = true;
  detectionProgressBar.max = 1;
  detectionProgressBar.value = 0;
  detectionProgressText.textContent = "0 of 0 images processed";
}

function createResultNode(file) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector(".result");
  const title = fragment.querySelector("h2");
  const summary = fragment.querySelector(".summary");
  const imageStage = fragment.querySelector(".imageStage");
  const canvas = fragment.querySelector(".imageCanvas");
  const downloadButton = fragment.querySelector(".resultDownload");
  const videoStage = fragment.querySelector(".videoStage");
  const video = fragment.querySelector("video");
  const videoOverlay = fragment.querySelector(".videoOverlay");

  const displayPath = getFileDisplayPath(file);
  title.textContent = displayPath;
  summary.textContent = "Queued";
  article.dataset.resultState = "queued";
  article.dataset.kind = file.type.startsWith("video/") ? "video" : "image";
  article.tabIndex = 0;
  article.setAttribute("aria-label", `Detection result for ${displayPath}`);
  article.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown");

  if (!file.type.startsWith("video/")) {
    const downloadUrl = URL.createObjectURL(file);
    downloadButton.href = downloadUrl;
    downloadButton.download = getDownloadFileName(displayPath, file);
    downloadButton.hidden = false;
    downloadButton.setAttribute("aria-label", `Download ${displayPath}`);
    canvas.tabIndex = -1;
    canvas.setAttribute("role", "button");
    canvas.setAttribute("aria-label", `Open ${displayPath} image preview`);
    canvas.addEventListener("click", () => {
      openResultImagePreview(canvas, displayPath);
    });
    article.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openResultImagePreview(canvas, displayPath);
    });
  }

  const node = {
    article,
    summary,
    imageStage,
    canvas,
    downloadButton,
    videoStage,
    video,
    videoOverlay,
    imageAnalysis: null,
    videoAnalysis: null,
    renderVideoOverlay: null,
    cacheHit: false,
    displayPath,
    downloadUrl: file.type.startsWith("video/") ? null : downloadButton.href,
  };
  article.fdxResultNode = node;
  return node;
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

async function addCandidateEmbeddings(faces, image, sourceName) {
  const candidates = selectMatchCandidates(faces, image);
  const diagnostics = [];

  for (const candidate of candidates) {
    try {
      const cropFile = await createFaceCandidateFile(image, candidate.face, sourceName, candidate.rank);
      const payload = await findFaces(
        cropFile,
        FACE_MATCH_PLUGINS,
        true,
        BACKEND_ACCURATE,
        getApiThreshold(),
        undefined,
        { inputMode: "cropped" },
      );
      const cropFaces = Array.isArray(payload.result) ? payload.result : [];
      const embeddedFace = selectBestEmbeddedFace(cropFaces);

      if (Array.isArray(embeddedFace?.embedding)) {
        candidate.face.accurateEmbedding = embeddedFace.embedding;
        candidate.face.embedding = embeddedFace.embedding;
        candidate.face.embeddingNorm = Number.isFinite(Number(embeddedFace.embedding_norm))
          ? Number(embeddedFace.embedding_norm)
          : null;
      }

      diagnostics.push({
        face: candidate.originalIndex + 1,
        fast_similarity: Number.isFinite(candidate.fastMatch?.similarity)
          ? Number(candidate.fastMatch.similarity.toFixed(4))
          : null,
        fast_match: candidate.fastMatch?.target?.name || null,
        embedded: Array.isArray(embeddedFace?.embedding),
        crop_faces: cropFaces.length,
      });
    } catch (error) {
      diagnostics.push({
        face: candidate.originalIndex + 1,
        embedded: false,
        error: error?.message || "Embedding failed",
      });
    }

    await yieldToBrowser();
  }

  return diagnostics;
}

function selectMatchCandidates(faces, image) {
  const scoredCandidates = faces
    .map((face, originalIndex) => {
      const box = normalizeBox(face.box, image.naturalWidth, image.naturalHeight);
      if (!box) return null;

      const probability = Number(face.box?.probability || 0);
      return {
        face,
        originalIndex,
        box,
        fastMatch: face.fastMatch || null,
        areaScore: box.width * box.height * Math.max(0.1, probability),
      };
    })
    .filter(Boolean);

  const selected = [];
  const addUnique = (candidates) => {
    candidates.forEach((candidate) => {
      if (selected.length >= MATCH_CANDIDATE_LIMIT) return;
      if (selected.some((item) => item.originalIndex === candidate.originalIndex)) return;
      selected.push(candidate);
    });
  };
  const byFastSimilarity = (first, second) =>
    (second.fastMatch?.similarity || 0) - (first.fastMatch?.similarity || 0)
    || second.areaScore - first.areaScore;
  const byArea = (first, second) => second.areaScore - first.areaScore;

  addUnique(
    scoredCandidates
      .filter((candidate) => (candidate.fastMatch?.similarity || 0) >= FAST_PREFILTER_SIMILARITY_THRESHOLD)
      .sort(byFastSimilarity),
  );
  addUnique(
    scoredCandidates
      .filter((candidate) => Number.isFinite(candidate.fastMatch?.similarity))
      .sort(byFastSimilarity),
  );
  addUnique(scoredCandidates.sort(byArea));

  return selected.map((candidate, rank) => ({ ...candidate, rank }));
}

async function createFaceCandidateFile(image, face, sourceName, rank) {
  const box = getPaddedFaceBox(face, image);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = box.width;
  canvas.height = box.height;
  context.drawImage(
    image,
    box.xMin,
    box.yMin,
    box.width,
    box.height,
    0,
    0,
    box.width,
    box.height,
  );

  const baseName = sourceName.replace(/\.[^.]+$/, "") || "face";
  return canvasToPngFile(canvas, `${baseName}-candidate-${rank + 1}.png`);
}

function getPaddedFaceBox(face, image) {
  const box = normalizeBox(face.box, image.naturalWidth, image.naturalHeight);
  if (!box) {
    return {
      xMin: 0,
      yMin: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  const padding = Math.round(Math.max(box.width, box.height) * MATCH_CANDIDATE_PADDING);
  const xMin = clamp(Math.floor(box.xMin - padding), 0, image.naturalWidth);
  const yMin = clamp(Math.floor(box.yMin - padding), 0, image.naturalHeight);
  const xMax = clamp(Math.ceil(box.xMin + box.width + padding), xMin + 1, image.naturalWidth);
  const yMax = clamp(Math.ceil(box.yMin + box.height + padding), yMin + 1, image.naturalHeight);

  return {
    xMin,
    yMin,
    width: xMax - xMin,
    height: yMax - yMin,
  };
}

function selectBestEmbeddedFace(faces) {
  return faces
    .filter((face) => Array.isArray(face.embedding))
    .sort((first, second) => getFaceArea(second.box) - getFaceArea(first.box))[0];
}

function getFaceArea(box = {}) {
  return Math.max(0, Number(box.x_max || 0) - Number(box.x_min || 0))
    * Math.max(0, Number(box.y_max || 0) - Number(box.y_min || 0));
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

  return payload;
}

function getFindFacesPath(backend) {
  return backend === BACKEND_FAST ? "/api/fast/find_faces" : "/api/accurate/find_faces";
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
      nextTrackId = assignFaceTracks(
        detectedFaces,
        tracks,
        timestamp,
        sampleInterval,
        nextTrackId,
      );
      const faces = useEmbeddings ? detectedFaces.map(addRealtimeTargetMatch) : detectedFaces;
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
  if (addedEntries.some(hasTargetEmbedding)) {
    requestCurrentDetectionSourceRefresh();
  }
}

async function addTargetFaceFile(file, options = {}) {
  const {
    singleFace = false,
    croppedFace = false,
    sourceName = file.name,
    defaultName = getDefaultTargetName(sourceName),
  } = options;
  const image = await loadImage(file);
  const baseName = defaultName || getDefaultTargetName(file.name);

  try {
    const accuratePayload = await findFaces(
      file,
      FACE_MATCH_PLUGINS,
      true,
      BACKEND_ACCURATE,
      croppedFace ? CROPPED_TARGET_DETECTION_THRESHOLD : TARGET_DETECTION_THRESHOLD,
      undefined,
      croppedFace ? { inputMode: "cropped" } : {},
    );
    const accurateFaces = Array.isArray(accuratePayload.result)
      ? accuratePayload.result.map(normalizeAccurateDetectionFace)
      : [];
    const selectedFaces = singleFace ? selectPrimaryTargetFace(accurateFaces, image) : accurateFaces;
    const candidateEntries = selectedFaces
      .map((face, index) => createFaceEntry(
        file,
        image,
        face,
        index,
        getEntryName(baseName, index, selectedFaces.length),
        sourceName,
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

    targetFaces.unshift(...entries);
    renderTargetFaces();
    return entries;
  } catch (error) {
    const fallback = createFallbackTarget(file, image, baseName, error.message, sourceName);
    targetFaces.unshift(fallback);
    renderTargetFaces();
    return [fallback];
  }
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
    if (entries.some(hasTargetEmbedding)) {
      requestCurrentDetectionSourceRefresh();
    }
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
      sourceName: file.name,
      defaultName: getDefaultTargetName(file.name),
    });
    const searchableCount = entries.filter(hasTargetEmbedding).length;

    if (searchableCount > 0) {
      closeTargetDrawPanel();
      requestCurrentDetectionSourceRefresh();
    } else {
      targetDrawStatus.textContent = entries[0]?.status || "No searchable face found";
      addDrawnTargetButton.disabled = false;
    }
  } catch (error) {
    targetDrawStatus.textContent = error?.message || "Could not add drawn face";
    addDrawnTargetButton.disabled = false;
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

function canvasToJpegFile(canvas, fileName, quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not encode selected face"));
        return;
      }
      resolve(new File([blob], fileName, { type: "image/jpeg" }));
    }, "image/jpeg", quality);
  });
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
    if (searchableCount > 0) {
      requestCurrentDetectionSourceRefresh();
    }
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

function createFaceEntry(file, image, face, index, name, sourceName = file.name) {
  const box = normalizeBox(face.box, image.naturalWidth, image.naturalHeight);
  if (!box) return null;

  const preview = createFacePreview(image, box);
  const probability = Number(face.box?.probability || 0);
  const matchQuality = getFaceMatchQuality(face);
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

  return {
    id: `${Date.now()}-${file.name}-${index}`,
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
  return {
    id: `${Date.now()}-${file.name}-fallback`,
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

function normalizeFastDetectionFace(face) {
  const fastEmbedding = Array.isArray(face?.fastEmbedding)
    ? face.fastEmbedding
    : Array.isArray(face?.embedding) ? face.embedding : null;
  return {
    ...face,
    fastEmbedding,
    accurateEmbedding: null,
    embedding: null,
  };
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

function findClosestFaceByBox(face, candidateFaces, image) {
  const box = normalizeBox(face.box, image.naturalWidth, image.naturalHeight);
  if (!box || candidateFaces.length === 0) return null;
  const centerX = box.xMin + box.width / 2;
  const centerY = box.yMin + box.height / 2;
  const imageDiagonal = Math.hypot(image.naturalWidth, image.naturalHeight) || 1;

  return candidateFaces
    .map((candidate) => {
      const candidateBox = normalizeBox(candidate.box, image.naturalWidth, image.naturalHeight);
      if (!candidateBox) return null;
      const candidateCenterX = candidateBox.xMin + candidateBox.width / 2;
      const candidateCenterY = candidateBox.yMin + candidateBox.height / 2;
      const centerDistance = Math.hypot(centerX - candidateCenterX, centerY - candidateCenterY) / imageDiagonal;
      return {
        face: candidate,
        score: boxIntersectionOverUnion(toApiBox(box), toApiBox(candidateBox)) - centerDistance,
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score)[0]?.face || null;
}

function toApiBox(box) {
  return {
    x_min: box.xMin,
    y_min: box.yMin,
    x_max: box.xMin + box.width,
    y_max: box.yMin + box.height,
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
    const title = fragment.querySelector("h3");
    const dimensions = fragment.querySelector("p");
    const nameInput = fragment.querySelector(".faceName");
    const deleteButton = fragment.querySelector(".faceDelete");
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
    nameInput.addEventListener("change", () => refreshCachedTargetMatches());
    deleteButton.setAttribute("aria-label", `Delete ${getTargetLabel(face, index)}`);
    deleteButton.addEventListener("click", () => {
      deleteTargetFace(face.id);
    });
    confidence.textContent = hasTargetEmbedding(face) ? face.status : face.status || "n/a";
    source.textContent = face.source;
    article.dataset.faceId = face.id;
    article.tabIndex = 0;
    article.setAttribute("aria-label", `${getTargetLabel(face, index)} from ${face.source}`);
    article.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown");
    facesGrid.append(article);
  });

  saveTargetFaces();
  syncMatchFilter();
}

function deleteTargetFace(faceId) {
  const index = targetFaces.findIndex((face) => face.id === faceId);
  if (index === -1) return;

  const [removedFace] = targetFaces.splice(index, 1);
  refreshCachedTargetMatches(new Set([removedFace.id]));
  renderTargetFaces();
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
    return Array.isArray(stored)
      ? stored
        .filter((face) => face && face.id && face.preview)
        .map(normalizeStoredTargetFace)
      : [];
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
    embedding: searchableEmbedding,
    accurateEmbedding,
    embeddingNorm: Number.isFinite(Number(face.embeddingNorm ?? face.embedding_norm))
      ? Number(face.embeddingNorm ?? face.embedding_norm)
      : null,
    fastEmbedding,
    status: face.status || (searchableEmbedding ? "Ready" : "No embedding"),
  };
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

function getFaceMatchQuality(face) {
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
  const isLargeEnough = width >= MIN_MATCH_FACE_SIZE_PX && height >= MIN_MATCH_FACE_SIZE_PX;
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
      min_size: MIN_MATCH_FACE_SIZE_PX,
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

function getBestTargetMatchForEmbedding(embedding, getTargetEmbedding) {
  if (!Array.isArray(embedding) || targetFaces.length === 0) return null;
  const probeEmbedding = normalizeEmbeddingVector(embedding);
  if (!probeEmbedding) return null;

  const matches = createIdentityProfiles(getTargetEmbedding)
    .map((profile) => {
      const similarity = getEmbeddingSimilarity(probeEmbedding, profile.embedding);
      if (!Number.isFinite(similarity)) return null;
      return {
        target: profile.target,
        identityKey: profile.identityKey,
        similarity,
        distance: Math.sqrt(Math.max(0, 2 - 2 * similarity)),
        gallerySampleCount: profile.sampleCount,
        rejectedEnrollmentCount: profile.rejectedCount,
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

function createIdentityProfiles(getTargetEmbedding) {
  const groups = new Map();
  targetFaces.forEach((target) => {
    const embedding = normalizeEmbeddingVector(getTargetEmbedding(target));
    if (!embedding) return;
    const identityKey = getTargetIdentityKey(target);
    const samples = groups.get(identityKey) || [];
    samples.push({ target, embedding });
    groups.set(identityKey, samples);
  });

  return Array.from(groups, ([identityKey, samples]) => createIdentityProfile(identityKey, samples))
    .filter(Boolean);
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
  };
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
  return String(target?.name || target?.source || target?.id || "")
    .trim()
    .toLowerCase();
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

  const render = () => {
    drawVideoOverlay(overlay);
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

function hasFastSearchableTargets() {
  return targetFaces.some((target) => Array.isArray(getTargetFastEmbedding(target)));
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

function drawVideoOverlay(canvas) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
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
