import { useState } from "react";
import Badge from "../../components/Badge";
import Dropzone from "../../components/Dropzone";
import Icon from "../../components/Icon";
import { usePlatform } from "../../context/PlatformContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";

const size = (value) =>
  value > 1024 ** 3
    ? `${(value / 1024 ** 3).toFixed(2)} GB`
    : `${(value / 1024 ** 2).toFixed(1)} MB`;

const supportedImage = (file) => /\.(jpe?g|png|webp)$/i.test(file.name);
const supportedBatchFile = (file) =>
  supportedImage(file) || /\.zip$/i.test(file.name);

export default function Uploads() {
  const { events, uploads, uploadPhotos } = usePlatform();
  const [eventId, setEventId] = useState("");
  const [files, setFiles] = useState([]);
  const [selectionSource, setSelectionSource] = useState("");
  const [selectionNotice, setSelectionNotice] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const selected = eventId || events[0]?.id || "";
  const uploadsTable = useInfiniteScroll(uploads, "Recent upload records");

  async function start() {
    if (!selected || !files.length || isUploading) return;
    setIsUploading(true);
    setError("");
    setStatus("");
    try {
      const result = await uploadPhotos(selected, files, setProgress);
      setStatus(
        `${result.uploaded.length} photos stored · ${result.jobsPublished} processing jobs created · ${result.skipped.length} skipped`,
      );
      setFiles([]);
      setSelectionSource("");
      setSelectionNotice("");
    } catch (uploadError) {
      setError(
        `Upload failed: ${uploadError.message || "The upload could not be completed."}`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  function selectFiles(source, nextFiles) {
    const accepted = nextFiles.filter(
      (file) =>
        file.size > 0 &&
        (source === "folder" ? supportedImage(file) : supportedBatchFile(file)),
    );
    const ignored = nextFiles.length - accepted.length;
    setSelectionSource(source);
    setFiles(accepted);
    setStatus("");
    setError(
      accepted.length
        ? ""
        : "No supported, non-empty image files were found in that selection.",
    );
    setSelectionNotice(
      ignored
        ? `${ignored} unsupported or empty ${ignored === 1 ? "file was" : "files were"} ignored.`
        : "",
    );
    setProgress(null);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Object storage</p>
          <h2>Event photo uploads</h2>
          <p>
            Upload images into an event-isolated storage path and create Kafka
            processing jobs.
          </p>
        </div>
      </div>
      <div className="upload-layout">
        <section className="card section">
          <div className="section-head">
            <div>
              <h3>Upload event photos</h3>
              <p>
                Checksums prevent duplicates and quota is enforced server-side.
              </p>
            </div>
          </div>
          <div className="field">
            <label>Destination event</label>
            <select
              value={selected}
              onChange={(event) => setEventId(event.target.value)}
              disabled={!events.length || isUploading}
            >
              {events.length ? (
                events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))
              ) : (
                <option>Create an event first</option>
              )}
            </select>
          </div>
          <Dropzone
            title="Drop an event photo batch"
            hint="JPG, PNG, WebP, or ZIP archive"
            accept="image/jpeg,image/png,image/webp,.zip,application/zip"
            disabled={isUploading}
            value={selectionSource === "batch" ? files : []}
            onFiles={(nextFiles) => selectFiles("batch", nextFiles)}
          />
          <Dropzone
            title="Choose an event folder"
            hint="Select a photographer folder as one complete batch"
            accept="image/jpeg,image/png,image/webp"
            directory
            disabled={isUploading}
            value={selectionSource === "folder" ? files : []}
            onFiles={(nextFiles) => selectFiles("folder", nextFiles)}
          />
          {files.length ? (
            <div
              className={`notice ${isUploading ? "upload-active" : "success"}`}
            >
              <Icon name="check" size={16} />
              <span>
                {isUploading
                  ? progress?.message || "Starting upload…"
                  : `${files.length} ${files.length === 1 ? "file" : "files"} ready`}
              </span>
              <button
                className="btn primary small"
                disabled={!selected || isUploading}
                onClick={start}
              >
                {isUploading ? `${progress?.percent ?? 0}%` : "Start upload"}
              </button>
            </div>
          ) : null}
          {isUploading ? (
            <div className="upload-progress" aria-live="polite">
              <div
                className="upload-progress-bar"
                role="progressbar"
                aria-label="Photo upload progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progress?.percent ?? 0}
              >
                <span style={{ width: `${progress?.percent ?? 0}%` }} />
              </div>
              <small>Keep this page open until the upload completes.</small>
            </div>
          ) : null}
          {status ? (
            <div className="notice success" role="status">
              <Icon name="check" size={16} />
              {status}
            </div>
          ) : null}
          {selectionNotice ? (
            <div className="notice warning" role="status">
              {selectionNotice}
            </div>
          ) : null}
          {error ? (
            <div className="notice error" role="alert">
              <span>{error}</span>
              {files.length ? (
                <button className="btn small" onClick={start}>
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
        <aside className="card section upload-guidance">
          <div>
            <span className="step-number">01</span>
            <h3>Choose an event</h3>
            <p>Objects are namespaced by organization and event.</p>
          </div>
          <div>
            <span className="step-number">02</span>
            <h3>Store originals</h3>
            <p>Local storage in development or AWS S3 in production.</p>
          </div>
          <div>
            <span className="step-number">03</span>
            <h3>Process securely</h3>
            <p>Kafka workers call RetinaFace and AdaFace.</p>
          </div>
        </aside>
      </div>
      <section className="card section">
        <div className="section-head">
          <div>
            <h3>Recent uploads</h3>
            <p>Persistent object and processing state</p>
          </div>
        </div>
        <div
          className="table-wrap infinite-scroll"
          {...uploadsTable.scrollProps}
        >
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Event</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {uploadsTable.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.filename}</td>
                  <td>{row.event}</td>
                  <td>{size(row.sizeBytes)}</td>
                  <td>{new Date(row.uploadedAt).toLocaleString()}</td>
                  <td>
                    <Badge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!uploads.length ? (
            <p className="empty-note">No photos uploaded yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
