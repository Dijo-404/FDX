import { useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import Select from "../../components/Select";
import { usePlatform } from "../../context/PlatformContext";

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  organizationId: "",
  name: "",
  description: "",
  date: today(),
  location: "",
});

export default function CollaboratorEvents() {
  const { organizations, events, addCollaboratorEvent } = usePlatform();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");
  const selectedOrganizationId =
    form.organizationId || organizations[0]?.id || "";

  async function submit(event) {
    event.preventDefault();
    const created = await addCollaboratorEvent({
      ...form,
      organizationId: selectedOrganizationId,
    });
    setNotice(`${created.name} was created for ${created.organization}.`);
    setForm(emptyForm());
    setOpen(false);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Metadata only</p>
          <h2>Events</h2>
          <p>
            Create event records without access to participant or media data.
          </p>
        </div>
        <button
          className="btn primary"
          disabled={!organizations.length}
          onClick={() => setOpen(true)}
        >
          <Icon name="plus" size={16} /> Create event
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
            <h3>Events you created</h3>
            <p>
              No participants, photos, matches, or processing data is shown.
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Organization</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.organization}</td>
                  <td>{item.date}</td>
                  <td>
                    <Badge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events.length ? (
            <p className="empty-note">Create your first event.</p>
          ) : null}
        </div>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create event"
        description="The organization’s default retention policy is applied automatically."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" form="collaborator-event-form">
              Create event
            </button>
          </>
        }
      >
        <form
          id="collaborator-event-form"
          className="form-grid"
          onSubmit={submit}
        >
          <div className="field full">
            <label>Organization</label>
            <Select
              value={selectedOrganizationId}
              onValueChange={(value) =>
                setForm({ ...form, organizationId: value })
              }
              ariaLabel="Organization"
              options={organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              }))}
            />
          </div>
          <div className="field full">
            <label>Event name</label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="field full">
            <label>Description</label>
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Date</label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm({ ...form, date: event.target.value })
              }
            />
          </div>
          <div className="field">
            <label>Location</label>
            <input
              required
              value={form.location}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
