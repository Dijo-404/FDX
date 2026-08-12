const LEVEL_TONE = { info: "success", warning: "warning", danger: "danger" };

export default function LogsTable({ logs, title, subtitle }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.timestamp}</td>
                <td>{log.actor}</td>
                <td>
                  <span className={`badge ${LEVEL_TONE[log.level] ?? "warning"}`}>
                    <span className="dot" />
                    {log.action}
                  </span>
                </td>
                <td>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
