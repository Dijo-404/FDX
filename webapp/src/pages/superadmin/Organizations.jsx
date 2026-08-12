import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Gauge from "../../components/Gauge";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import Toggle from "../../components/Toggle";
import { usePlatform } from "../../context/PlatformContext";
import "./Organizations.css";

const defaultExpiry = () => { const value = new Date(); value.setFullYear(value.getFullYear() + 1); return value.toISOString().slice(0, 10); };
const emptyForm = () => ({ name: "", type: "COLLEGE", contactName: "", contactEmail: "", phone: "", storageLimitGB: 100, retentionDays: 90, expiry: defaultExpiry() });

function PolicyEditor({ organization, update }) {
  const [quota, setQuota] = useState(organization.storageLimitGB);
  const [retention, setRetention] = useState(organization.retentionDays);
  const [expiry, setExpiry] = useState(organization.expiry ?? "");
  return <div className="form-grid single">
    <div className="field"><label>Storage quota (GB)</label><input type="number" min={Math.max(1, organization.storageUsedGB)} value={quota} onChange={(event) => setQuota(event.target.value)} onBlur={() => Number(quota) >= Math.max(1, organization.storageUsedGB) && Number(quota) !== organization.storageLimitGB && update(organization.id, { storageLimitGB: Number(quota) })} /></div>
    <div className="field"><label>Retention policy (days)</label><input type="number" min="1" max="3650" value={retention} onChange={(event) => setRetention(event.target.value)} onBlur={() => Number(retention) >= 1 && Number(retention) <= 3650 && Number(retention) !== organization.retentionDays && update(organization.id, { retentionDays: Number(retention) })} /></div>
    <div className="field"><label>Account expiry</label><input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} onBlur={() => expiry !== (organization.expiry ?? "") && update(organization.id, { expiry: expiry || null })} /></div>
  </div>;
}

export default function Organizations() {
  const { organizations, addOrganization, updateOrganization } = usePlatform();
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const selected = organizations.find((item) => item.id === selectedId) ?? organizations[0];
  const visible = useMemo(() => organizations.filter((item) => (type === "ALL" || item.type === type) && `${item.name} ${item.contactEmail}`.toLowerCase().includes(query.toLowerCase())), [organizations, query, type]);

  async function submit(event) {
    event.preventDefault();
    const created = await addOrganization(form);
    setSelectedId(created.id);
    setForm(emptyForm());
    setOpen(false);
  }

  return <div className="page">
    <div className="page-head"><div><p className="eyebrow">Tenant management</p><h2>Organizations</h2><p>Create colleges and companies, control access, quotas and retention.</p></div><button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> New organization</button></div>
    <div className="toolbar"><div className="toolbar-search"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organizations" /></div><select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">All types</option><option value="COLLEGE">Colleges</option><option value="COMPANY">Companies</option></select><span className="result-count">{visible.length} organizations</span></div>
    <div className="admin-split">
      <section className="card table-wrap organizations-table"><table><thead><tr><th>Organization</th><th>Type</th><th>Status</th><th>Usage</th><th>Next expiry</th></tr></thead><tbody>{visible.map((organization) => <tr key={organization.id} className={selected?.id === organization.id ? "row-selected" : ""} onClick={() => setSelectedId(organization.id)}><td><div className="table-identity"><span className="org-avatar small">{organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{organization.name}</strong><span>{organization.contactEmail}</span></div></div></td><td>{organization.type === "COLLEGE" ? "College" : "Company"}</td><td><Badge status={organization.status} /></td><td><div className="mini-usage"><span><i style={{ width: `${Math.min(100, organization.storageUsedGB / organization.storageLimitGB * 100)}%` }} /></span>{organization.storageUsedGB}/{organization.storageLimitGB} GB</div></td><td>{organization.nextDataExpiry ?? "—"}</td></tr>)}</tbody></table>{!visible.length ? <p className="empty-note">No organizations found.</p> : null}</section>
      {selected ? <aside className="card section organization-detail"><div className="section-head"><div><p className="eyebrow">Organization profile</p><h3>{selected.name}</h3></div><Toggle checked={selected.status === "active"} onChange={() => updateOrganization(selected.id, { status: selected.status === "active" ? "suspended" : "active" })} /></div><div className="gauge-row"><Gauge value={selected.storageUsedGB} max={selected.storageLimitGB} label="Storage used" sublabel={`${selected.storageUsedGB} GB`} /><Gauge value={Math.max(0, selected.storageLimitGB - selected.storageUsedGB)} max={selected.storageLimitGB} label="Remaining" sublabel={`${Math.max(0, selected.storageLimitGB - selected.storageUsedGB)} GB`} /></div><PolicyEditor key={selected.id} organization={selected} update={updateOrganization} /><div className="detail-stat-row"><div><p className="detail-stat-label">Users</p><p className="detail-stat-value">{selected.users}</p></div><div><p className="detail-stat-label">Events</p><p className="detail-stat-value">{selected.events}</p></div><div><p className="detail-stat-label">Retention</p><p className="detail-stat-value">{selected.retentionDays}d</p></div></div><div className="contact-block"><p className="eyebrow">Primary contact</p><strong>{selected.contactName}</strong><span>{selected.contactEmail}</span><span>{selected.phone}</span></div></aside> : null}
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="Create organization" description="Provision a college or company tenant with its own policy boundaries." footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary" form="organization-form">Create organization</button></>}>
      <form id="organization-form" className="form-grid" onSubmit={submit}>
        <div className="field full"><label>Organization name</label><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Chennai Institute of Technology" /></div>
        <div className="field"><label>Organization type</label><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="COLLEGE">College</option><option value="COMPANY">Company</option></select></div>
        <div className="field"><label>Contact name</label><input required value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></div>
        <div className="field"><label>Contact email</label><input required type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></div>
        <div className="field"><label>Phone</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
        <div className="field"><label>Storage quota (GB)</label><input required type="number" min="1" value={form.storageLimitGB} onChange={(event) => setForm({ ...form, storageLimitGB: Number(event.target.value) })} /></div>
        <div className="field"><label>Retention (days)</label><input required type="number" min="1" max="3650" value={form.retentionDays} onChange={(event) => setForm({ ...form, retentionDays: Number(event.target.value) })} /></div>
        <div className="field"><label>Account expiry</label><input type="date" value={form.expiry} onChange={(event) => setForm({ ...form, expiry: event.target.value })} /></div>
      </form>
    </Modal>
  </div>;
}
