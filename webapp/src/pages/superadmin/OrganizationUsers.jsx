import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import { usePlatform } from "../../context/PlatformContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";

export default function OrganizationUsers() {
  const { organizations, organizationUsers, addOrganizationUser } =
    usePlatform();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", email: "", organizationId: "" });
  const visible = useMemo(
    () =>
      organizationUsers.filter((item) =>
        `${item.name} ${item.email} ${item.organization}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [organizationUsers, query],
  );
  const usersTable = useInfiniteScroll(
    visible,
    "Organization administrator records",
  );
  const selectedOrganizationId =
    form.organizationId || organizations[0]?.id || "";

  async function submit(event) {
    event.preventDefault();
    const invited = await addOrganizationUser({
      ...form,
      organizationId: selectedOrganizationId,
    });
    setNotice(
      invited.developmentInviteUrl
        ? `Invite sent. Development link: ${invited.developmentInviteUrl}`
        : `Invite queued for ${form.email}`,
    );
    setOpen(false);
    setForm({
      name: "",
      email: "",
      organizationId: organizations[0]?.id ?? "",
    });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Access management</p>
          <h2>Organization users</h2>
          <p>
            Create tenant administrators and track secure invitation status.
          </p>
        </div>
        <button
          className="btn primary"
          disabled={!organizations.length}
          onClick={() => setOpen(true)}
        >
          <Icon name="plus" size={16} /> Invite admin
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
            onChange={(event) => {
              setQuery(event.target.value);
              usersTable.reset();
            }}
            placeholder="Search users or organizations"
          />
        </div>
        <span className="result-count">{visible.length} users</span>
      </div>
      <div
        className="card table-wrap infinite-scroll"
        {...usersTable.scrollProps}
      >
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Organization</th>
              <th>Role</th>
              <th>Account</th>
              <th>Invitation</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {usersTable.rows.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="table-identity">
                    <span className="person-avatar">
                      {user.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>{user.organization}</td>
                <td>Organization Admin</td>
                <td>
                  <Badge status={user.status} />
                </td>
                <td>
                  <Badge status={user.invite} />
                </td>
                <td>{user.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length ? (
          <p className="empty-note">No organization administrators found.</p>
        ) : null}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite organization admin"
        description="The recipient will receive a secure link to set their password."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" form="user-form">
              <Icon name="mail" size={15} /> Send invite
            </button>
          </>
        }
      >
        <form id="user-form" className="form-grid single" onSubmit={submit}>
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
            <label>Email address</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Organization</label>
            <select
              required
              value={selectedOrganizationId}
              onChange={(event) =>
                setForm({ ...form, organizationId: event.target.value })
              }
              disabled={!organizations.length}
            >
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="permission-note">
            <strong>Organization Admin</strong>
            <p>
              Can manage events, participants, photos, matches and deliveries
              only within the selected organization.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
