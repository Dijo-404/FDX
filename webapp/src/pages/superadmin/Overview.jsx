import PageState from "../../components/PageState";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import { usePlatform } from "../../context/PlatformContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";

export default function SuperAdminOverview() {
  const { user } = useAuth();
  const { dashboard, loading, error } = usePlatform();
  const stats = dashboard?.stats;
  const activityScroll = useInfiniteScroll(
    dashboard?.logs ?? [],
    "Recent platform activity",
  );
  return (
    <div className="page dashboard-page admin-dashboard">
      <div className="page-head">
        <div>
          <p className="eyebrow">Platform overview</p>
          <h2>Good morning, {user?.name?.split(" ")[0]}</h2>
          <p>Live operational data from the FDX platform.</p>
        </div>
      </div>
      <PageState loading={loading} error={error}>
        {stats ? (
          <>
            <div className="stat-grid">
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
            </div>
            <div className="two-col admin-dashboard-workspace">
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
                    {dashboard.organizations.slice(0, 5).map((org) => {
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
              <section className="card section platform-pulse">
                <div className="section-head platform-pulse-head">
                  <div>
                    <h3>Platform pulse</h3>
                    <p>Capacity, delivery and infrastructure</p>
                  </div>
                  <a className="text-link" href="/admin/system">
                    System health
                  </a>
                </div>
                <div className="pulse-grid">
                  <div className="pulse-item">
                    <span className="pulse-icon">
                      <Icon name="storage" size={18} />
                    </span>
                    <div>
                      <span>Storage used</span>
                      <strong>{stats.storageUsedGB} GB</strong>
                      <small>of {stats.storageLimitGB} GB</small>
                    </div>
                  </div>
                  <div className="pulse-item">
                    <span className="pulse-icon">
                      <Icon name="processing" size={18} />
                    </span>
                    <div>
                      <span>Processing jobs</span>
                      <strong>{stats.processingJobs}</strong>
                      <small>{stats.failedJobs} failed</small>
                    </div>
                  </div>
                  <div className="pulse-item">
                    <span className="pulse-icon">
                      <Icon name="delivery" size={18} />
                    </span>
                    <div>
                      <span>Emails sent</span>
                      <strong>{stats.emailsSent}</strong>
                      <small>Enrollment and galleries</small>
                    </div>
                  </div>
                  <div className="pulse-item">
                    <span className="pulse-icon">
                      <Icon name="health" size={18} />
                    </span>
                    <div>
                      <span>System health</span>
                      <strong>
                        {dashboard.services.every(
                          (service) => service.status === "healthy",
                        )
                          ? "Healthy"
                          : "Degraded"}
                      </strong>
                      <small>Live dependency checks</small>
                    </div>
                  </div>
                </div>
                <div className="activity-summary-head">
                  <div>
                    <h4>Recent activity</h4>
                    <p>Latest security and operational events</p>
                  </div>
                  <a className="text-link" href="/admin/logs">
                    View all
                  </a>
                </div>
                {dashboard.logs.length ? (
                  <div
                    className="activity-list activity-list-compact infinite-scroll recent-activity-scroll"
                    {...activityScroll.scrollProps}
                  >
                    {activityScroll.rows.map((log) => (
                      <div className="activity-row" key={log.id}>
                        <span className={`activity-dot ${log.level}`} />
                        <div className="activity-content">
                          <p className="activity-action">{log.action}</p>
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
          </>
        ) : null}
      </PageState>
    </div>
  );
}
