import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/StatCard";
import Gauge from "../../components/Gauge";
import Badge from "../../components/Badge";
import { events, students, collegeStorage } from "../../lib/mockData";

export default function CollegeOverview() {
  const { user } = useAuth();
  const storage = collegeStorage(user?.collegeId);
  const matchedStudents = students.filter((s) => s.status === "matched").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p>Total events and other details for {user?.collegeName}.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon="events" label="Total events" value={events.length} hint="This academic year" />
        <StatCard icon="students" label="Students uploaded" value={students.length} hint={`${matchedStudents} matched`} />
        <StatCard icon="face" label="Faces detected" value={events.reduce((s, e) => s + e.facesDetected, 0)} hint="Across all events" />
        <StatCard icon="storage" label="Storage used" value={`${storage.usedGB} GB`} hint={`of ${storage.limitGB} GB`} />
      </div>

      <div className="two-col">
        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Recent events</h3>
              <p>Photo processing status</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Photos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.name}</td>
                    <td>{event.date}</td>
                    <td>{event.photos}</td>
                    <td><Badge status={event.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Storage</h3>
              <p>Used vs. remaining</p>
            </div>
          </div>
          <div className="gauge-row">
            <Gauge value={storage.usedGB} max={storage.limitGB} label="Used" sublabel={`${storage.usedGB} GB`} />
            <Gauge
              value={storage.limitGB - storage.usedGB}
              max={storage.limitGB}
              label="Remaining"
              sublabel={`${storage.limitGB - storage.usedGB} GB`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
