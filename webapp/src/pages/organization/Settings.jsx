import { useEffect, useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import { usePlatform } from "../../context/PlatformContext";
export default function Settings() {
  const { organization, updateSettings } = usePlatform();
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    phone: "",
  });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (organization)
      setForm({
        contactName: organization.contactName || "",
        contactEmail: organization.contactEmail || "",
        phone: organization.phone || "",
      });
  }, [organization]);
  async function save() {
    await updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }
  if (!organization)
    return (
      <div className="page-state card">
        <strong>Loading organization settings…</strong>
      </div>
    );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace configuration</p>
          <h2>Settings</h2>
          <p>Organization profile and policy boundaries.</p>
        </div>
        {saved ? (
          <div className="notice-inline">
            <Icon name="check" size={15} /> Saved
          </div>
        ) : null}
      </div>
      <div className="settings-layout">
        <div className="settings-nav card">
          <button className="active">Organization profile</button>
          <button disabled>Privacy & consent</button>
          <button disabled>Security</button>
        </div>
        <div className="settings-content">
          <section className="card section">
            <div className="section-head">
              <div>
                <h3>Organization profile</h3>
                <p>Displayed in participant invitations and galleries.</p>
              </div>
              <Badge status="active">{organization.type}</Badge>
            </div>
            <div className="form-grid">
              <div className="field full">
                <label>Organization name</label>
                <input value={organization.name} disabled />
              </div>
              <div className="field">
                <label>Primary contact</label>
                <input
                  value={form.contactName}
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Contact email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm({ ...form, contactEmail: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Support phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <button className="btn primary settings-save" onClick={save}>
              Save changes
            </button>
          </section>
          <section className="card section">
            <div className="section-head">
              <div>
                <h3>Policy boundaries</h3>
                <p>Enforced globally and managed by FDX Super Admin.</p>
              </div>
            </div>
            <div className="locked-policy">
              <div>
                <Icon name="storage" size={18} />
                <span>Storage quota</span>
                <strong>
                  {organization.storageUsedGB} / {organization.storageLimitGB}{" "}
                  GB
                </strong>
              </div>
              <div>
                <Icon name="events" size={18} />
                <span>Retention policy</span>
                <strong>{organization.retentionDays} days</strong>
              </div>
              <div>
                <Icon name="health" size={18} />
                <span>Account expiry</span>
                <strong>{organization.expiry || "No expiry"}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
