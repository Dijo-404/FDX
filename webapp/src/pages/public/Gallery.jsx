import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import { api } from "../../lib/api";

export default function Gallery() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`/public/gallery/${token}`)
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, [token]);
  const allSelected =
    Boolean(data?.photos.length) && selected.length === data.photos.length;
  const downloadUrl = `/api/public/gallery/${token}/download${selected.length ? `?photoIds=${encodeURIComponent(selected.join(","))}` : ""}`;
  function toggle(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <span className="login-mark">FDX</span>
        <div>
          <p className="eyebrow">Private gallery</p>
          <h1>{data?.event ?? "Your event photos"}</h1>
          <p>
            {data
              ? `${data.participant} · ${data.organization}`
              : "Loading securely…"}
          </p>
        </div>
      </header>
      {error ? <p className="login-error">{error}</p> : null}
      {data ? (
        <>
          <div className="gallery-toolbar">
            <div>
              <span>{data.photos.length} matched photos</span>
              <span>
                Expires {new Date(data.expiresAt).toLocaleDateString()}
              </span>
            </div>
            {data.photos.length ? (
              <div className="gallery-actions">
                <button
                  className="btn"
                  onClick={() =>
                    setSelected(
                      allSelected ? [] : data.photos.map((photo) => photo.id),
                    )
                  }
                >
                  {allSelected ? "Clear selection" : "Select all"}
                </button>
                <a className="btn primary" href={downloadUrl}>
                  <Icon name="download" size={16} />
                  {selected.length
                    ? `Download selected (${selected.length})`
                    : "Download all"}
                </a>
              </div>
            ) : null}
          </div>
          <main className="photo-gallery">
            {data.photos.map((photo) => (
              <figure
                key={photo.id}
                className={selected.includes(photo.id) ? "selected" : ""}
              >
                <button
                  className="photo-select"
                  aria-label={`Select ${photo.filename}`}
                  onClick={() => toggle(photo.id)}
                >
                  <Icon
                    name={selected.includes(photo.id) ? "check" : "plus"}
                    size={15}
                  />
                </button>
                <a href={photo.url} aria-label={`Open ${photo.filename}`}>
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.filename}
                    loading="lazy"
                  />
                </a>
                <figcaption>
                  {photo.filename}
                  <a href={photo.url} download>
                    <Icon name="download" size={16} /> Download
                  </a>
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
