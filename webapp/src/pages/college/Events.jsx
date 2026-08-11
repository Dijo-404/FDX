import Badge from "../../components/Badge";
import { events } from "../../lib/mockData";
import "./Events.css";

export default function Events() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Events</h2>
          <p>Photo folders uploaded per event and their processing status.</p>
        </div>
      </div>

      <div className="events-grid">
        {events.map((event) => (
          <div className="card event-card" key={event.id}>
            <div className="event-card-head">
              <h3>{event.name}</h3>
              <Badge status={event.status} />
            </div>
            <p className="event-date">{event.date}</p>
            <div className="event-stats">
              <div>
                <p className="detail-stat-label">Photos</p>
                <p className="detail-stat-value">{event.photos}</p>
              </div>
              <div>
                <p className="detail-stat-label">Faces</p>
                <p className="detail-stat-value">{event.facesDetected}</p>
              </div>
              <div>
                <p className="detail-stat-label">Matched</p>
                <p className="detail-stat-value">{event.matched}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
