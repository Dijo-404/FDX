import { useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import Select from "../../components/Select";
import { usePlatform } from "../../context/PlatformContext";

const emptyForm = () => ({
  name: "",
  type: "COLLEGE",
  contactName: "",
  contactEmail: "",
  phone: "",
});

export default function CollaboratorOrganizations() {
  const { organizations, addOrganization } = usePlatform();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");

  async function submit(event) {
    event.preventDefault();
    const created = await addOrganization(form);
    setNotice(`${created.name} was created and is ready for events.`);
    setForm(emptyForm());
    setOpen(false);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Collaborator workspace</p>
          <h2>Organizations</h2>
          <p>Create an organization without access to its private data.</p>
        </div>
        <button className="btn primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> New organization
        </button>
      </div>

      {notice ? (
        <div className="notice success" role="status">
          <Icon name="check" size={16} />
          {notice}
        </div>
      ) : null}

      <section className="card section">
        <div className="section-head">
          <div>
            <h3>Available organizations</h3>
            <p>Only organization names and account state are visible.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <td>{organization.name}</td>
                  <td>
                    {organization.type === "COLLEGE" ? "College" : "Company"}
                  </td>
                  <td>
                    <Badge status={organization.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!organizations.length ? (
            <p className="empty-note">Create the first organization.</p>
          ) : null}
        </div>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create organization"
        description="Default storage and retention policies are applied automatically."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" form="collaborator-org-form">
              Create organization
            </button>
          </>
        }
      >
        <form
          id="collaborator-org-form"
          className="form-grid"
          onSubmit={submit}
        >
          <div className="field full">
            <label>Organization name</label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Organization type</label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: value })}
              ariaLabel="Organization type"
              options={[
                { value: "COLLEGE", label: "College" },
                { value: "COMPANY", label: "Company" },
              ]}
            />
          </div>
          <div className="field">
            <label>Contact name</label>
            <input
              required
              value={form.contactName}
              onChange={(event) =>
                setForm({ ...form, contactName: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Contact email</label>
            <input
              required
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                setForm({ ...form, contactEmail: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Phone</label>
            <input
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
