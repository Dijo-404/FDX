import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import ResilientImage from "../../components/ResilientImage";
import { api, directUpload } from "../../lib/api";

async function sha256(file) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export default function Enrollment() {
  const { token } = useParams();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api(`/v2/public/enrollment/${token}`)
      .then((response) => {
        setInfo(response.data);
        if (response.data.status === "verified") {
          setDone(response.data);
          setSelectedPhotoIds(new Set());
        }
      })
      .catch((requestError) => setError(requestError.message));
    return () =>
      streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [token]);

  async function camera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraReady(true);
      setError("");
    } catch (requestError) {
      setError(
        `Camera unavailable: ${requestError.message}. You can choose a selfie file instead.`,
      );
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setImage(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
        setPreview(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setCameraReady(false);
      },
      "image/jpeg",
      0.92,
    );
  }

  async function submit() {
    if (!image || !consent) return;
    setSubmitting(true);
    setError("");
    const consentBody = new FormData();
    consentBody.append("accepted", "true");
    try {
      await api(`/v2/public/enrollment/${token}/consent`, {
        method: "POST",
        body: consentBody,
      });
      const upload = await api(`/v2/public/enrollment/${token}/upload-url`, {
        method: "POST",
        body: JSON.stringify({
          filename: image.name,
          content_type: image.type,
          size_bytes: image.size,
          sha256: await sha256(image),
        }),
      });
      await directUpload(upload.data.upload_url, image, upload.data.headers);
      const completed = await api(`/v2/public/enrollment/${token}/complete`, {
        method: "POST",
      });
      setDone(completed.data);
      setSelectedPhotoIds(new Set());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetEnrollment() {
    if (preview) URL.revokeObjectURL(preview);
    setDone(null);
    setImage(null);
    setPreview("");
    setConsent(false);
    setSelectedPhotoIds(new Set());
    setError("");
  }

  function togglePhoto(photoId) {
    setSelectedPhotoIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function toggleAllPhotos() {
    setSelectedPhotoIds((current) =>
      current.size === done.photos.length
        ? new Set()
        : new Set(done.photos.map((photo) => photo.id)),
    );
  }

  async function downloadSelectedPhotos() {
    const selectedPhotos = done.photos.filter((photo) =>
      selectedPhotoIds.has(photo.id),
    );
    if (!selectedPhotos.length || downloading) return;
    if (selectedPhotos.length === 1) {
      window.location.assign(selectedPhotos[0].download_url);
      return;
    }

    setDownloading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v2/public/enrollment/${token}/download`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            media_ids: selectedPhotos.map((photo) => photo.id),
          }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error?.message || "Selected photos could not be downloaded.",
        );
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      link.href = blobUrl;
      link.download = filename || "fdx-selected-photos.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloading(false);
    }
  }

  const allPhotosSelected = Boolean(
    done?.photos?.length && selectedPhotoIds.size === done.photos.length,
  );
  const somePhotosSelected = selectedPhotoIds.size > 0 && !allPhotosSelected;

  if (done)
    return (
      <div className="public-shell">
        <main className="public-card card enrollment-results-card">
          <div className="public-brand enrollment-results-brand">
            <span className="login-mark">FDX</span>
            <div>
              <p className="eyebrow">Your event photos</p>
              <h1>{done.event_name ?? info?.event_name}</h1>
              <p className="enrollment-organization">
                {done.organization_name ?? info?.organization_name}
              </p>
            </div>
          </div>
          <section className="enrollment-result-summary">
            <span className="success-mark">
              <Icon name="check" size={28} />
            </span>
            <div>
              <h2>Face verified securely</h2>
              <p>
                {done.photos?.length
                  ? `We found ${done.photos.length} ${done.photos.length === 1 ? "photo" : "photos"} of you in this event.`
                  : "No matching event photos are available yet."}
              </p>
              <span>
                This link remains available until{" "}
                {new Date(done.expires_at ?? info?.expires_at).toLocaleString()}
                .
              </span>
            </div>
          </section>
          {done.photos?.length ? (
            <section>
              <div className="enrollment-gallery-toolbar">
                <h2 className="enrollment-gallery-title">
                  Your matched photos
                </h2>
                <div className="enrollment-gallery-controls">
                  <label className="gallery-select-all">
                    <input
                      type="checkbox"
                      checked={allPhotosSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = somePhotosSelected;
                      }}
                      onChange={toggleAllPhotos}
                    />
                    Select all
                  </label>
                  <span>
                    {selectedPhotoIds.size
                      ? `${selectedPhotoIds.size} of ${done.photos.length} selected`
                      : `${done.photos.length} photos`}
                  </span>
                  <button
                    className="btn primary small"
                    disabled={!selectedPhotoIds.size || downloading}
                    onClick={downloadSelectedPhotos}
                  >
                    <Icon name="download" size={16} />
                    {downloading
                      ? "Preparing ZIP…"
                      : `Download selected (${selectedPhotoIds.size})`}
                  </button>
                </div>
              </div>
              {error ? (
                <p className="login-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="photo-gallery enrollment-photo-gallery">
                {done.photos.map((photo) => (
                  <figure
                    key={photo.id}
                    className={
                      selectedPhotoIds.has(photo.id) ? "selected" : undefined
                    }
                  >
                    <label
                      className={`photo-select${selectedPhotoIds.has(photo.id) ? " selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPhotoIds.has(photo.id)}
                        onChange={() => togglePhoto(photo.id)}
                        aria-label={`Select ${photo.filename}`}
                      />
                      {selectedPhotoIds.has(photo.id) ? (
                        <Icon name="check" size={16} />
                      ) : null}
                    </label>
                    <ResilientImage
                      src={photo.thumbnail_url}
                      alt={photo.filename}
                      loading="lazy"
                    />
                    <figcaption>
                      {photo.filename}
                      <a href={photo.download_url}>
                        <Icon name="download" size={16} /> Download
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : (
            <div className="page-state enrollment-empty-state">
              Your selfie is enrolled. Reopen this link before the expiry time
              shown above to check for newly available matches.
            </div>
          )}
          <div className="enrollment-results-actions">
            <button className="btn" onClick={resetEnrollment}>
              Use a different selfie
            </button>
          </div>
        </main>
      </div>
    );
  return (
    <div className="public-shell">
      <main className="public-card card">
        <div className="public-brand">
          <span className="login-mark">FDX</span>
          <div>
            <p className="eyebrow">Participant verification</p>
            <h1>Find your event photos</h1>
          </div>
        </div>
        {info ? (
          <div className="event-summary">
            <strong>{info.event_name}</strong>
            <span>
              {info.organization_name} · For {info.participant_name}
            </span>
          </div>
        ) : null}
        {error ? <p className="login-error">{error}</p> : null}
        <div className="camera-frame">
          {preview ? (
            <img src={preview} alt="Captured selfie" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted />
          )}
        </div>
        <div className="camera-actions">
          {preview ? (
            <button
              className="btn"
              onClick={() => {
                URL.revokeObjectURL(preview);
                setImage(null);
                setPreview("");
              }}
            >
              Retake
            </button>
          ) : (
            <>
              <button className="btn primary" onClick={camera}>
                <Icon name="face" size={16} /> Enable camera
              </button>
              <button className="btn" onClick={capture} disabled={!cameraReady}>
                Take selfie
              </button>
              <label className="btn">
                Choose file
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(event) => {
                    const file = event.target.files[0];
                    if (file) {
                      setImage(file);
                      setPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </>
          )}
        </div>
        <label className="consent-row">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            I consent to FDX processing this selfie into a face embedding solely
            to find my photographs for this event. The data expires with the
            event retention policy.
          </span>
        </label>
        <button
          className="btn primary"
          disabled={!image || !consent || submitting}
          onClick={submit}
        >
          {submitting ? "Verifying face…" : "Submit secure enrollment"}
        </button>
      </main>
    </div>
  );
}
