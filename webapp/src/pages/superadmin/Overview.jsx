import Badge from "../../components/Badge";
import PageState from "../../components/PageState";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import { usePlatform } from "../../context/PlatformContext";

export default function SuperAdminOverview() {
  const { user } = useAuth();
  const { dashboard, loading, error } = usePlatform();
  const stats = dashboard?.stats;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform overview</p>
          <h2>Good morning, {user?.name?.split(" ")[0]}</h2>
          <p>Live operational data from the FDX platform.</p>
        </div>
        <div className="live-chip">
          <span /> Live platform data
        </div>
      </div>
      <PageState loading={loading} error={error}>
        {stats ? (
          <>
            <div className="stat-grid stat-grid-wide">
              <StatCard
                icon="organization"
                label="Organizations"
                value={stats.organizations}
                hint={`${stats.activeOrganizations} active`}
              />
              <StatCard
                icon="users"
                label="Organization users"
                value={stats.organizationUsers}
                hint="Tenant administrators"
              />
              <StatCard
                icon="events"
                label="Total events"
                value={stats.events}
                hint={`${stats.expiringData} expiring soon`}
              />
              <StatCard
                icon="face"
                label="Photos uploaded"
                value={stats.photos.toLocaleString()}
                hint="Across all tenants"
              />
              <StatCard
                icon="storage"
                label="Storage used"
                value={`${stats.storageUsedGB} GB`}
                hint={`of ${stats.storageLimitGB} GB`}
              />
              <StatCard
                icon="processing"
                label="Processing jobs"
                value={stats.processingJobs}
                hint={`${stats.failedJobs} failed`}
              />
              <StatCard
                icon="delivery"
                label="Emails sent"
                value={stats.emailsSent}
                hint="Enrollment and galleries"
              />
              <StatCard
                icon="health"
                label="System health"
                value={
                  dashboard.services.every((x) => x.status === "healthy")
                    ? "Healthy"
                    : "Degraded"
                }
                hint="Live dependency checks"
              />
            </div>
            <div className="two-col">
              <section className="card section">
                <div className="section-head">
                  <div>
                    <h3>Organization usage</h3>
                    <p>Storage, event volume and account status</p>
                  </div>
                  <a className="text-link" href="/admin/organizations">
                    Manage all
                  </a>
                </div>
                {dashboard.organizations.length ? (
                  <div className="usage-list">
                    {dashboard.organizations.map((org) => {
                      const percent = org.storageLimitGB
                        ? Math.round(
                            (org.storageUsedGB / org.storageLimitGB) * 100,
                          )
                        : 0;
                      return (
                        <div className="usage-row" key={org.id}>
                          <div className="org-avatar">
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="usage-main">
                            <div>
                              <strong>{org.name}</strong>
                              <span>
                                {org.type.toLowerCase()} · {org.events} events
                              </span>
                            </div>
                            <div className="progress-track">
                              <span
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                          </div>
                          <div className="usage-value">
                            <strong>{percent}%</strong>
                            <span>
                              {org.storageUsedGB}/{org.storageLimitGB} GB
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-note">
                    Create an organization to begin onboarding.
                  </p>
                )}
              </section>
              <section className="card section">
                <div className="section-head">
                  <div>
                    <h3>Recent activity</h3>
                    <p>Security and operational audit trail</p>
                  </div>
                </div>
                {dashboard.logs.length ? (
                  <div className="activity-list">
                    {dashboard.logs.map((log) => (
                      <div className="activity-row" key={log.id}>
                        <span className={`activity-dot ${log.level}`} />
                        <div>
                          <p className="activity-action">{log.action}</p>
                          <p className="activity-detail">{log.details}</p>
                          <p className="activity-meta">
                            {log.actor} ·{" "}
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-note">No platform activity yet.</p>
                )}
              </section>
            </div>
            <section className="card section">
              <div className="section-head">
                <div>
                  <h3>Service status</h3>
                  <p>Live application and infrastructure health</p>
                </div>
                <Badge
                  status={
                    dashboard.services.every((x) => x.status === "healthy")
                      ? "healthy"
                      : "degraded"
                  }
                />
              </div>
              <div className="service-grid">
                {dashboard.services.map((service) => (
                  <div className="service-item" key={service.name}>
                    <span className={`service-status ${service.status}`} />
                    <div>
                      <strong>{service.name}</strong>
                      <p>{service.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </PageState>
    </div>
  );
}
