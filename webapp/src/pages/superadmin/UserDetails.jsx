import Badge from "../../components/Badge";
import { superAdminUserDetails } from "../../lib/mockData";

export default function UserDetails() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>User details</h2>
          <p>Every admin account across the platform.</p>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>College</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {superAdminUserDetails.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.college}</td>
                <td>{u.role}</td>
                <td><Badge status={u.status} /></td>
                <td>{u.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
