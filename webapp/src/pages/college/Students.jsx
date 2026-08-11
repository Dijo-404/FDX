import Badge from "../../components/Badge";
import StatCard from "../../components/StatCard";
import { students } from "../../lib/mockData";

export default function Students() {
  const matched = students.filter((s) => s.status === "matched").length;
  const pending = students.filter((s) => s.status === "pending").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Students</h2>
          <p>Roster uploaded via Excel, and how many were matched to faces.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon="students" label="Total students" value={students.length} hint="Uploaded via Excel" />
        <StatCard icon="face" label="Matched" value={matched} hint="Found in event photos" />
        <StatCard icon="upload" label="Pending" value={pending} hint="Awaiting processing" />
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Uploaded</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.uploadedAt}</td>
                <td><Badge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
