import { useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import { usePlatform } from "../../context/PlatformContext";
import { useAuth } from "../../context/AuthContext";
import "./Events.css";

const isoDate = (value) => value.toISOString().slice(0, 10);
const eventDefaults = () => {
  const eventDate = new Date();
  const expiry = new Date(eventDate);
  expiry.setDate(expiry.getDate() + 90);
  return {
    name: "",
    description: "",
    date: isoDate(eventDate),
    location: "",
    retentionDays: 90,
    expiresAt: isoDate(expiry),
  };
};

export default function Events() {
  const { events, addEvent } = usePlatform();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(eventDefaults);
  async function submit(event) {
    event.preventDefault();
    await addEvent(form);
    setOpen(false);
    setForm(eventDefaults());
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Event workspace</p>
          <h2>Events</h2>
          <p>
            Create an event, enroll participants, process photos and deliver
            private galleries.
          </p>
        </div>
        {user?.role === "org_admin" ? (
          <button className="btn primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} /> Create event
          </button>
        ) : null}
      </div>
      <div className="workflow-strip">
        {[
          "Create event",
          "Participants",
          "Event photos",
          "Face processing",
          "Private galleries",
        ].map((step, index) => (
          <div key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
            {index < 4 ? <Icon name="arrow" size={15} /> : null}
          </div>
        ))}
      </div>
      <div className="events-grid">
        {events.map((event) => {
          const progress =
            event.status === "delivered"
              ? 100
              : event.status === "ready"
                ? 92
                : event.status === "processing"
                  ? 46
                  : 6;
          return (
            <article className="card event-card modern" key={event.id}>
              <div className="event-card-head">
                <div className="date-tile">
                  <strong>
                    {new Date(`${event.date}T00:00:00`).getDate()}
                  </strong>
                  <span>
                    {new Date(`${event.date}T00:00:00`).toLocaleString("en", {
                      month: "short",
                    })}
                  </span>
                </div>
                <Badge status={event.status} />
              </div>
              <div>
                <h3>{event.name}</h3>
                <p className="event-date">{event.location}</p>
              </div>
              <div className="event-progress">
                <div>
                  <span>Workflow progress</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="event-stats">
                <div>
                  <p className="detail-stat-label">Photos</p>
                  <p className="detail-stat-value">
                    {event.photos.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="detail-stat-label">Participants</p>
                  <p className="detail-stat-value">{event.participants}</p>
                </div>
                <div>
                  <p className="detail-stat-label">Matched</p>
                  <p className="detail-stat-value">{event.matched}</p>
                </div>
              </div>
              <footer>
                <span>Expires {event.expiresAt}</span>
                <a
                  className="btn ghost small"
                  href={`/organization/events/${event.id}`}
                >
                  Open event <Icon name="arrow" size={14} />
                </a>
              </footer>
            </article>
          );
        })}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create event"
        description="An event ID and isolated storage path will be created automatically."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" form="event-form">
              Create event
            </button>
          </>
        }
      >
        <form id="event-form" className="form-grid" onSubmit={submit}>
          <div className="field full">
            <label>Event name</label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="e.g. GDG DevFest 2026"
            />
          </div>
          <div className="field full">
            <label>Description</label>
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(event) =>
                setForm({ ...form, date: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Location</label>
            <input
              required
              value={form.location}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Retention period (days)</label>
            <input
              type="number"
              min="1"
              max="3650"
              required
              value={form.retentionDays}
              onChange={(event) =>
                setForm({ ...form, retentionDays: Number(event.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>Data expiry</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(event) =>
                setForm({ ...form, expiresAt: event.target.value })
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
