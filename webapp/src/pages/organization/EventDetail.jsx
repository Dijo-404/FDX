import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import PageState from "../../components/PageState";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import { usePlatform } from "../../context/PlatformContext";
import { api } from "../../lib/api";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deleteEvent } = usePlatform();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    api(`/organization/events/${eventId}`)
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, [eventId]);
  async function remove() {
    if (
      !window.confirm(
        "Delete this event, every photo, face embedding, match, and gallery permanently?",
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteEvent(eventId);
      navigate("/organization/events", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setDeleting(false);
    }
  }
  return (
    <div className="page">
      <PageState loading={!data && !error} error={error}>
        {data ? (
          <>
            <div className="page-head">
              <div>
                <p className="eyebrow">Event results</p>
                <h2>{data.name}</h2>
                <p>
                  {data.location || "No location"} ·{" "}
                  {new Date(`${data.date}T00:00:00`).toLocaleDateString()} ·
                  expires {data.expiresAt}
                </p>
              </div>
              <div className="row-actions">
                <Badge status={data.status} />
                {user?.role === "org_admin" ? (
                  <button
                    className="btn danger"
                    disabled={deleting}
                    onClick={remove}
                  >
                    <Icon name="close" size={15} />
                    {deleting ? "Deleting…" : "Delete event"}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="stat-grid">
              <StatCard
                icon="face"
                label="Photos"
                value={data.photos}
                hint={`${data.facesDetected} faces detected`}
              />
              <StatCard
                icon="students"
                label="Participants"
                value={data.participants}
                hint={`${data.enrolled} enrolled`}
              />
              <StatCard
                icon="check"
                label="Matched"
                value={data.matched}
                hint={`${data.matchCounts.high ?? 0} high confidence`}
              />
              <StatCard
                icon="delivery"
                label="Delivered"
                value={data.delivered}
                hint={`${data.deliveryCounts.ready ?? 0} ready`}
              />
            </div>
            <div className="two-col">
              <section className="card section">
                <div className="section-head">
                  <div>
                    <h3>Recent participants</h3>
                    <p>Enrollment, matching and delivery state</p>
                  </div>
                  <a href="/organization/participants" className="text-link">
                    Manage all
                  </a>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Enrollment</th>
                        <th>Matches</th>
                        <th>Delivery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.participantsList.map((participant) => (
                        <tr key={participant.id}>
                          <td>
                            <div className="table-identity">
                              <div>
                                <strong>{participant.name}</strong>
                                <span>{participant.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Badge status={participant.enrollment} />
                          </td>
                          <td>{participant.matches}</td>
                          <td>
                            <Badge status={participant.delivery} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="card section">
                <div className="section-head">
                  <div>
                    <h3>Recent photos</h3>
                    <p>Object storage and ML processing state</p>
                  </div>
                  <a href="/organization/uploads" className="text-link">
                    Upload more
                  </a>
                </div>
                <div className="service-list">
                  {data.photosList.map((photo) => (
                    <div className="job-row" key={photo.id}>
                      <div>
                        <strong>{photo.filename}</strong>
                        <span>
                          {new Date(photo.uploadedAt).toLocaleString()}
                        </span>
                      </div>
                      <Badge status={photo.status} />
                    </div>
                  ))}
                  {!data.photosList.length ? (
                    <p className="empty-note">No photos uploaded.</p>
                  ) : null}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </PageState>
    </div>
  );
}
