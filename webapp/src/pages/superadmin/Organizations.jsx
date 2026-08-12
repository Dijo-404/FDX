import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Gauge from "../../components/Gauge";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import Toggle from "../../components/Toggle";
import { usePlatform } from "../../context/PlatformContext";
import "./Colleges.css";

const emptyForm = { name: "", type: "COLLEGE", contactName: "", contactEmail: "", phone: "", storageLimitGB: 100, retentionDays: 90, expiry: "2027-08-12" };

export default function Organizations() {
  const { organizations, addOrganization, updateOrganization } = usePlatform();
  const [selectedId, setSelectedId] = useState(organizations[0]?.id);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const selected = organizations.find((item) => item.id === selectedId) ?? organizations[0];
  const visible = useMemo(() => organizations.filter((item) => (type === "ALL" || item.type === type) && `${item.name} ${item.contactEmail}`.toLowerCase().includes(query.toLowerCase())), [organizations, query, type]);

  function submit(event) {
    event.preventDefault();
    const id = addOrganization(form);
    setSelectedId(id);
    setForm(emptyForm);
    setOpen(false);
  }

  return <div className="page">
    <div className="page-head"><div><p className="eyebrow">Tenant management</p><h2>Organizations</h2><p>Create colleges and companies, control access, quotas and retention.</p></div><button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> New organization</button></div>
    <div className="toolbar"><div className="toolbar-search"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organizations" /></div><select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">All types</option><option value="COLLEGE">Colleges</option><option value="COMPANY">Companies</option></select><span className="result-count">{visible.length} organizations</span></div>
    <div className="admin-split">
      <section className="card table-wrap organizations-table">
        <table><thead><tr><th>Organization</th><th>Type</th><th>Status</th><th>Usage</th><th>Next expiry</th></tr></thead><tbody>{visible.map((organization) => <tr key={organization.id} className={selectedId === organization.id ? "row-selected" : ""} onClick={() => setSelectedId(organization.id)}><td><div className="table-identity"><span className="org-avatar small">{organization.name.slice(0, 2).toUpperCase()}</span><div><strong>{organization.name}</strong><span>{organization.contactEmail}</span></div></div></td><td>{organization.type === "COLLEGE" ? "College" : "Company"}</td><td><Badge status={organization.status} /></td><td><div className="mini-usage"><span><i style={{ width: `${Math.min(100, organization.storageUsedGB / organization.storageLimitGB * 100)}%` }} /></span>{organization.storageUsedGB}/{organization.storageLimitGB} GB</div></td><td>{organization.nextDataExpiry}</td></tr>)}</tbody></table>
      </section>
      {selected ? <aside className="card section organization-detail"><div className="section-head"><div><p className="eyebrow">Organization profile</p><h3>{selected.name}</h3></div><Toggle checked={selected.status === "active"} onChange={() => updateOrganization(selected.id, { status: selected.status === "active" ? "suspended" : "active" })} /></div><div className="gauge-row"><Gauge value={selected.storageUsedGB} max={selected.storageLimitGB} label="Storage used" sublabel={`${selected.storageUsedGB} GB`} /><Gauge value={selected.storageLimitGB - selected.storageUsedGB} max={selected.storageLimitGB} label="Remaining" sublabel={`${selected.storageLimitGB - selected.storageUsedGB} GB`} /></div><div className="form-grid single"><div className="field"><label>Storage quota (GB)</label><input type="number" min={selected.storageUsedGB} value={selected.storageLimitGB} onChange={(event) => updateOrganization(selected.id, { storageLimitGB: Number(event.target.value) })} /></div><div className="field"><label>Retention policy</label><select value={selected.retentionDays} onChange={(event) => updateOrganization(selected.id, { retentionDays: Number(event.target.value) })}><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">1 year</option></select></div><div className="field"><label>Account expiry</label><input type="date" value={selected.expiry} onChange={(event) => updateOrganization(selected.id, { expiry: event.target.value })} /></div></div><div className="detail-stat-row"><div><p className="detail-stat-label">Users</p><p className="detail-stat-value">{selected.users}</p></div><div><p className="detail-stat-label">Events</p><p className="detail-stat-value">{selected.events}</p></div><div><p className="detail-stat-label">Retention</p><p className="detail-stat-value">{selected.retentionDays}d</p></div></div><div className="contact-block"><p className="eyebrow">Primary contact</p><strong>{selected.contactName}</strong><span>{selected.contactEmail}</span><span>{selected.phone}</span></div></aside> : null}
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="Create organization" description="Provision a college or company tenant with its own policy boundaries." footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary" form="organization-form">Create organization</button></>}><form id="organization-form" className="form-grid" onSubmit={submit}><div className="field full"><label>Organization name</label><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Chennai Institute of Technology" /></div><div className="field"><label>Organization type</label><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="COLLEGE">College</option><option value="COMPANY">Company</option></select></div><div className="field"><label>Contact name</label><input required value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></div><div className="field"><label>Contact email</label><input required type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></div><div className="field"><label>Phone</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div className="field"><label>Storage quota (GB)</label><input required type="number" min="10" value={form.storageLimitGB} onChange={(event) => setForm({ ...form, storageLimitGB: Number(event.target.value) })} /></div><div className="field"><label>Retention</label><select value={form.retentionDays} onChange={(event) => setForm({ ...form, retentionDays: Number(event.target.value) })}><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option><option value="180">180 days</option></select></div><div className="field"><label>Account expiry</label><input type="date" value={form.expiry} onChange={(event) => setForm({ ...form, expiry: event.target.value })} /></div></form></Modal>
  </div>;
}
