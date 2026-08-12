import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "../../components/Icon";
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
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api(`/v2/public/enrollment/${token}`)
      .then((response) => setInfo(response.data))
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
      await api(`/v2/public/enrollment/${token}/complete`, { method: "POST" });
      setDone(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done)
    return (
      <div className="public-shell">
        <div className="public-card card success-view">
          <span className="success-mark">
            <Icon name="check" size={28} />
          </span>
          <h1>Face verified securely</h1>
          <p>
            FDX will email your private gallery when matching is complete. No
            account is required.
          </p>
        </div>
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
