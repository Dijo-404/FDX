import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import { api } from "../../lib/api";

export default function Gallery() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exportJob, setExportJob] = useState(null);

  useEffect(() => {
    api(`/v2/public/gallery/${token}`)
      .then((response) => setData(response.data))
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

  async function downloadAll() {
    try {
      setError("");
      const response = await api(`/v2/public/gallery/${token}/exports`, {
        method: "POST",
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
      const response = await api(`/v2/public/gallery/${token}/download-url`, {
        method: "POST",
        body: JSON.stringify({ media_id: photo.id }),
      });
      window.location.assign(response.data.url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

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
      {error ? <p className="login-error">{error}</p> : null}
      {data ? (
        <>
          <div className="gallery-toolbar">
            <div>
              <span>{data.photos.length} matched photos</span>
              <span>
                Expires {new Date(data.expires_at).toLocaleDateString()}
              </span>
            </div>
            {data.photos.length ? (
              <div className="gallery-actions">
                <button
                  className="btn primary"
                  onClick={downloadAll}
                  disabled={["QUEUED", "PROCESSING"].includes(
                    exportJob?.status,
                  )}
                >
                  <Icon name="download" size={16} />
                  {["QUEUED", "PROCESSING"].includes(exportJob?.status)
                    ? "Preparing ZIP…"
                    : "Download all"}
                </button>
              </div>
            ) : null}
          </div>
          <main className="photo-gallery">
            {data.photos.map((photo) => (
              <figure key={photo.id}>
                <img
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
