const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const results = document.querySelector("#results");
const template = document.querySelector("#resultTemplate");
const statusText = document.querySelector("#status");
const clearButton = document.querySelector("#clear");
const threshold = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#thresholdValue");

threshold.addEventListener("input", () => {
  thresholdValue.value = Number(threshold.value).toFixed(2);
});

clearButton.addEventListener("click", () => {
  results.replaceChildren();
  fileInput.value = "";
});

fileInput.addEventListener("change", () => {
  handleFiles(fileInput.files);
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

async function checkBackend() {
  try {
    const response = await fetch("/health");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    statusText.textContent = "Detector ready";
  } catch (error) {
    statusText.textContent = "Detector backend is still starting";
  }
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  for (const file of files) {
    const node = createResultNode(file);
    results.prepend(node.article);
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

  const data = new FormData();
  data.append("file", file, file.name);

  try {
    const url = `/api/find_faces?face_plugins=&limit=0&det_prob_threshold=${threshold.value}`;
    const response = await fetch(url, { method: "POST", body: data });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    const faces = Array.isArray(payload.result) ? payload.result : [];
    drawImage(node.canvas, image, faces);
    node.summary.classList.remove("error");
    node.summary.textContent = `${faces.length} face${faces.length === 1 ? "" : "s"} detected`;
    node.raw.textContent = JSON.stringify(payload, null, 2);
  } catch (error) {
    node.summary.classList.add("error");
    node.summary.textContent = error.message;
    node.raw.textContent = "";
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
  context.strokeStyle = "#16a34a";
  context.fillStyle = "#16a34a";
  context.font = `${Math.max(12, Math.round(14 * scale))}px system-ui`;

  faces.forEach((face, index) => {
    const box = face.box || {};
    const x = Number(box.x_min || 0) * scale;
    const y = Number(box.y_min || 0) * scale;
    const w = (Number(box.x_max || 0) - Number(box.x_min || 0)) * scale;
    const h = (Number(box.y_max || 0) - Number(box.y_min || 0)) * scale;
    const probability = Number(box.probability || 0);
    const label = probability ? `${index + 1} ${probability.toFixed(3)}` : `${index + 1}`;

    context.strokeRect(x, y, w, h);
    const labelWidth = context.measureText(label).width + 10;
    context.fillRect(x, Math.max(0, y - 22), labelWidth, 22);
    context.fillStyle = "#ffffff";
    context.fillText(label, x + 5, Math.max(14, y - 7));
    context.fillStyle = "#16a34a";
  });
}

checkBackend();
setInterval(checkBackend, 5000);
