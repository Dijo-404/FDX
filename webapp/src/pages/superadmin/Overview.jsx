import StatCard from "../../components/StatCard";
import Badge from "../../components/Badge";
import { colleges, superAdminLogs } from "../../lib/mockData";

export default function SuperAdminOverview() {
  const totalColleges = colleges.length;
  const activeColleges = colleges.filter((c) => c.status === "active").length;
  const totalUsers = colleges.reduce((sum, c) => sum + c.users, 0);
  const totalEvents = colleges.reduce((sum, c) => sum + c.events, 0);
  const totalStorageUsed = colleges.reduce((sum, c) => sum + c.storageUsedGB, 0);
  const totalStorageLimit = colleges.reduce((sum, c) => sum + c.storageLimitGB, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p>Total events and platform overview across all colleges.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon="colleges" label="Total colleges" value={totalColleges} hint={`${activeColleges} active`} />
        <StatCard icon="events" label="Total events" value={totalEvents} hint="Across all colleges" />
        <StatCard icon="students" label="Total users" value={totalUsers} hint="College accounts + students" />
        <StatCard
          icon="storage"
          label="Storage used"
          value={`${totalStorageUsed} GB`}
          hint={`of ${totalStorageLimit} GB provisioned`}
        />
      </div>

      <div className="two-col">
        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Colleges by storage</h3>
              <p>Highest usage first</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>College</th>
                  <th>Status</th>
                  <th>Used</th>
                  <th>Events</th>
                </tr>
              </thead>
              <tbody>
                {[...colleges]
                  .sort((a, b) => b.storageUsedGB - a.storageUsedGB)
                  .map((college) => (
                    <tr key={college.id}>
                      <td>{college.name}</td>
                      <td><Badge status={college.status} /></td>
                      <td>{college.storageUsedGB} GB / {college.storageLimitGB} GB</td>
                      <td>{college.events}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Recent activity</h3>
              <p>Latest platform logs</p>
            </div>
          </div>
          <div className="activity-list">
            {superAdminLogs.slice(0, 5).map((log) => (
              <div className="activity-row" key={log.id}>
                <span className={`activity-dot ${log.level}`} />
                <div>
                  <p className="activity-action">{log.action}</p>
                  <p className="activity-meta">{log.actor} · {log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
