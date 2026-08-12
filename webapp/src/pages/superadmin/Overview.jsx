import Badge from "../../components/Badge";
import StatCard from "../../components/StatCard";
import { usePlatform } from "../../context/PlatformContext";
import { superAdminLogs, systemServices } from "../../lib/mockData";

export default function SuperAdminOverview() {
  const { organizations, organizationUsers, events } = usePlatform();
  const totalPhotos = events.reduce((sum, event) => sum + event.photos, 0);
  const storageUsed = organizations.reduce((sum, item) => sum + item.storageUsedGB, 0);
  const storageLimit = organizations.reduce((sum, item) => sum + item.storageLimitGB, 0);
  const healthyServices = systemServices.filter((service) => service.status === "healthy").length;

  return (
    <div className="page">
      <div className="page-head">
        <div><p className="eyebrow">Platform overview</p><h2>Good morning, Aarav</h2><p>Here is what is happening across FDX today.</p></div>
        <div className="live-chip"><span /> Live · updated just now</div>
      </div>

      <div className="stat-grid stat-grid-wide">
        <StatCard icon="organization" label="Organizations" value={organizations.length} hint={`${organizations.filter((item) => item.status === "active").length} active`} />
        <StatCard icon="users" label="Organization users" value={organizationUsers.length} hint="1 invite pending" />
        <StatCard icon="events" label="Total events" value={events.reduce((sum, item) => sum + (item.id < 5 ? 1 : 0), 0) + 39} hint="Across all tenants" />
        <StatCard icon="face" label="Photos processed" value={totalPhotos.toLocaleString()} hint="8,920 faces detected" />
        <StatCard icon="storage" label="Storage used" value={`${storageUsed} GB`} hint={`${Math.round(storageUsed / storageLimit * 100)}% of ${storageLimit} GB`} />
        <StatCard icon="processing" label="Processing jobs" value="26" hint="4 need attention" />
        <StatCard icon="delivery" label="Emails sent" value="4,821" hint="98.7% delivered" />
        <StatCard icon="health" label="System health" value={`${healthyServices}/${systemServices.length}`} hint="Kafka is degraded" />
      </div>

      <div className="two-col">
        <section className="card section">
          <div className="section-head"><div><h3>Organization usage</h3><p>Storage, event volume and account status</p></div><a className="text-link" href="/admin/organizations">Manage all</a></div>
          <div className="usage-list">
            {organizations.map((organization) => {
              const percent = Math.round(organization.storageUsedGB / organization.storageLimitGB * 100);
              return <div className="usage-row" key={organization.id}>
                <div className="org-avatar">{organization.name.slice(0, 2).toUpperCase()}</div>
                <div className="usage-main"><div><strong>{organization.name}</strong><span>{organization.type.toLowerCase()} · {organization.events} events</span></div><div className="progress-track"><span style={{ width: `${percent}%` }} /></div></div>
                <div className="usage-value"><strong>{percent}%</strong><span>{organization.storageUsedGB}/{organization.storageLimitGB} GB</span></div>
              </div>;
            })}
          </div>
        </section>

        <section className="card section">
          <div className="section-head"><div><h3>Recent activity</h3><p>Security and operational audit trail</p></div></div>
          <div className="activity-list">
            {superAdminLogs.slice(0, 5).map((log) => <div className="activity-row" key={log.id}><span className={`activity-dot ${log.level}`} /><div><p className="activity-action">{log.action}</p><p className="activity-detail">{log.details}</p><p className="activity-meta">{log.actor} · {log.timestamp}</p></div></div>)}
          </div>
        </section>
      </div>

      <section className="card section">
        <div className="section-head"><div><h3>Service status</h3><p>Live application and infrastructure health</p></div><Badge status="healthy">Operational</Badge></div>
        <div className="service-grid">{systemServices.map((service) => <div className="service-item" key={service.name}><span className={`service-status ${service.status}`} /><div><strong>{service.name}</strong><p>{service.detail}</p></div></div>)}</div>
      </section>
    </div>
  );
}
