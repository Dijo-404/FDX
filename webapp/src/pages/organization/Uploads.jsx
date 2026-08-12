import { useState } from "react";
import Badge from "../../components/Badge";
import Dropzone from "../../components/Dropzone";
import Icon from "../../components/Icon";
import { usePlatform } from "../../context/PlatformContext";

const size = (value) =>
  value > 1024 ** 3
    ? `${(value / 1024 ** 3).toFixed(2)} GB`
    : `${(value / 1024 ** 2).toFixed(1)} MB`;

export default function Uploads() {
  const { events, uploads, uploadPhotos } = usePlatform();
  const [eventId, setEventId] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const selected = eventId || events[0]?.id || "";

  async function start() {
    const result = await uploadPhotos(selected, files);
    setStatus(
      `${result.uploaded.length} photos stored · ${result.jobsPublished} Kafka jobs published · ${result.skipped.length} skipped`,
    );
    setFiles([]);
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
              disabled={!events.length}
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
            onFiles={setFiles}
          />
          <Dropzone
            title="Choose an event folder"
            hint="Select a photographer folder as one complete batch"
            accept="image/jpeg,image/png,image/webp"
            directory
            onFiles={setFiles}
          />
          {files.length ? (
            <div className="notice success">
              <Icon name="check" size={16} />
              {files.length} files ready
              <button
                className="btn primary small"
                disabled={!selected}
                onClick={start}
              >
                Start upload
              </button>
            </div>
          ) : null}
          {status ? <div className="notice success">{status}</div> : null}
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
        <div className="table-wrap">
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
              {uploads.map((row) => (
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
