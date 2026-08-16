import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import Select from "../../components/Select";
import { usePlatform } from "../../context/PlatformContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";

export default function OrganizationUsers() {
  const { organizations, organizationUsers, addOrganizationUser } =
    usePlatform();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "org_admin",
    organizationId: "",
  });
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
      organizationId: form.role === "org_admin" ? selectedOrganizationId : null,
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
      role: "org_admin",
      organizationId: organizations[0]?.id ?? "",
    });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Access management</p>
          <h2>Users and collaborators</h2>
          <p>
            Invite tenant administrators or restricted platform collaborators.
          </p>
        </div>
        <button className="btn primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> Invite user
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
                <td>{user.organization || "Platform-wide"}</td>
                <td>
                  {user.role === "collaborator"
                    ? "Collaborator"
                    : user.role === "staff"
                      ? "Staff"
                      : "Organization Admin"}
                </td>
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
        {!visible.length ? <p className="empty-note">No users found.</p> : null}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite user"
        description="The recipient will receive a secure link to set their password."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className="btn primary"
              form="user-form"
              disabled={form.role === "org_admin" && !selectedOrganizationId}
            >
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
            <label>Role</label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm({ ...form, role: value })}
              ariaLabel="Role"
              options={[
                { value: "org_admin", label: "Organization Admin" },
                { value: "collaborator", label: "Collaborator" },
              ]}
            />
          </div>
          {form.role === "org_admin" ? (
            <div className="field">
              <label>Organization</label>
              <Select
                value={selectedOrganizationId}
                onValueChange={(value) =>
                  setForm({ ...form, organizationId: value })
                }
                disabled={!organizations.length}
                ariaLabel="Organization"
                options={organizations.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </div>
          ) : null}
          <div className="permission-note">
            <strong>
              {form.role === "collaborator"
                ? "Restricted Collaborator"
                : "Organization Admin"}
            </strong>
            {form.role === "collaborator" ? (
              <p>
                Can create organizations and events. Cannot access participants,
                uploads, photos, faces, matches, deliveries, or audit data.
              </p>
            ) : (
              <p>
                Can manage events, participants, photos, matches and deliveries
                only within the selected organization.
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
