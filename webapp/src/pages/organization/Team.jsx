import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import { usePlatform } from "../../context/PlatformContext";

export default function Team() {
  const { team, inviteStaff } = usePlatform();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", email: "" });
  const visible = useMemo(
    () =>
      team.filter((member) =>
        `${member.name} ${member.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, team],
  );
  async function submit(event) {
    event.preventDefault();
    const invited = await inviteStaff(form);
    setNotice(
      invited.developmentInviteUrl
        ? `Staff invited. Development link: ${invited.developmentInviteUrl}`
        : `Invitation sent to ${invited.email}`,
    );
    setForm({ name: "", email: "" });
    setOpen(false);
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Access management</p>
          <h2>Team</h2>
          <p>
            Invite operational staff without granting policy, approval, or
            delivery permissions.
          </p>
        </div>
        <button className="btn primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> Invite staff
        </button>
      </div>
      {notice ? (
        <div className="notice success">
          <Icon name="check" size={16} />
          {notice}
        </div>
      ) : null}
      <div className="toolbar">
        <div className="toolbar-search">
          <Icon name="search" size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search team"
          />
        </div>
        <span className="result-count">{visible.length} members</span>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Invitation</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="table-identity">
                    <span className="person-avatar">
                      {member.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  {member.role === "org_admin" ? "Organization Admin" : "Staff"}
                </td>
                <td>
                  <Badge status={member.status} />
                </td>
                <td>
                  <Badge status={member.invite} />
                </td>
                <td>
                  {member.lastActive
                    ? new Date(member.lastActive).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite operations staff"
        description="Staff can upload participants and event photos but cannot change policy, approve matches, delete events, or send galleries."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" form="staff-form">
              Send invitation
            </button>
          </>
        }
      >
        <form id="staff-form" className="form-grid single" onSubmit={submit}>
          <div className="field">
            <label>Full name</label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
