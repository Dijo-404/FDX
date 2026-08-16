import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import ResilientImage from "../../components/ResilientImage";
import { api } from "../../lib/api";

export default function Gallery() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exportJob, setExportJob] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    api(`/v2/public/gallery/${token}`)
      .then((response) => {
        setData(response.data);
        setSelectedIds(new Set());
      })
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  const pollExport = useCallback(
    async (exportId) => {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const response = await api(
          `/v2/public/gallery/${token}/exports/${exportId}`,
        );
        setExportJob(response.data);
        if (response.data.status === "READY") return response.data;
        if (["FAILED", "EXPIRED"].includes(response.data.status))
          throw new Error(response.data.error || "Gallery export failed");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error(
        "Gallery export is still being prepared. Please try again shortly.",
      );
    },
    [token],
  );

  async function downloadSelected() {
    const selectedPhotos = data.photos.filter((photo) =>
      selectedIds.has(photo.id),
    );
    if (!selectedPhotos.length) return;
    if (selectedPhotos.length === 1) {
      await downloadPhoto(selectedPhotos[0]);
      return;
    }
    try {
      setError("");
      const response = await api(`/v2/public/gallery/${token}/exports`, {
        method: "POST",
        body: JSON.stringify({
          media_ids: selectedPhotos.map((photo) => photo.id),
        }),
      });
      setExportJob(response.data);
      const ready = await pollExport(response.data.export_id);
      window.location.assign(ready.download_url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function downloadPhoto(photo) {
    try {
      setError("");
      const response = await api(`/v2/public/gallery/${token}/download-url`, {
        method: "POST",
        body: JSON.stringify({ media_id: photo.id }),
      });
      window.location.assign(response.data.url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function togglePhoto(photoId) {
    setExportJob(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function toggleAll() {
    setExportJob(null);
    setSelectedIds((current) =>
      current.size === data.photos.length
        ? new Set()
        : new Set(data.photos.map((photo) => photo.id)),
    );
  }

  const exportInProgress = ["QUEUED", "PROCESSING"].includes(exportJob?.status);
  const allSelected = Boolean(
    data?.photos.length && selectedIds.size === data.photos.length,
  );
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <span className="login-mark">FDX</span>
        <div>
          <p className="eyebrow">Private gallery</p>
          <h1>{data?.event_name ?? "Your event photos"}</h1>
          <p>{data ? data.organization_name : "Loading securely…"}</p>
        </div>
      </header>
      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}
      {data ? (
        <>
          <div className="gallery-toolbar">
            <div>
              {data.photos.length ? (
                <label className="gallery-select-all">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                  />
                  Select all photos
                </label>
              ) : null}
              <span>
                {selectedIds.size
                  ? `${selectedIds.size} of ${data.photos.length} selected`
                  : `${data.photos.length} matched photos`}
              </span>
              <span>
                Expires {new Date(data.expires_at).toLocaleDateString()}
              </span>
            </div>
            {data.photos.length ? (
              <div className="gallery-actions">
                <button
                  className="btn primary"
                  onClick={downloadSelected}
                  disabled={!selectedIds.size || exportInProgress}
                >
                  <Icon name="download" size={16} />
                  {exportInProgress
                    ? "Preparing ZIP…"
                    : `Download selected (${selectedIds.size})`}
                </button>
              </div>
            ) : null}
          </div>
          <main className="photo-gallery">
            {data.photos.map((photo) => (
              <figure
                key={photo.id}
                className={selectedIds.has(photo.id) ? "selected" : undefined}
              >
                <label
                  className={`photo-select${selectedIds.has(photo.id) ? " selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(photo.id)}
                    onChange={() => togglePhoto(photo.id)}
                    aria-label={`Select ${photo.filename}`}
                  />
                  {selectedIds.has(photo.id) ? (
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
                  <button
                    className="link-button"
                    onClick={() => downloadPhoto(photo)}
                  >
                    <Icon name="download" size={16} /> Download
                  </button>
                </figcaption>
              </figure>
            ))}
          </main>
          {!data.photos.length ? (
            <div className="page-state card">
              No approved photos are available.
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
