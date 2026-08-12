import Badge from "../../components/Badge";
import Gauge from "../../components/Gauge";
import PageState from "../../components/PageState";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import { usePlatform } from "../../context/PlatformContext";
export default function OrganizationOverview() {
  const { user } = useAuth();
  const { dashboard, loading, error } = usePlatform();
  const org = dashboard?.organization;
  const events = dashboard?.events ?? [];
  const stats = dashboard?.stats;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Organization overview</p>
          <h2>Welcome back, {user?.name?.split(" ")[0]}</h2>
          <p>
            {org?.name ?? user?.organizationName} · Live event photo operations.
          </p>
        </div>
        {org ? (
          <div className="policy-chips">
            <span>{org.retentionDays}-day retention</span>
            <span>
              {org.storageUsedGB}/{org.storageLimitGB} GB
            </span>
          </div>
        ) : null}
      </div>
      <PageState loading={loading} error={error}>
        {stats && org ? (
          <>
            <div className="stat-grid">
              <StatCard
                icon="events"
                label="Events"
                value={stats.events}
                hint="Organization total"
              />
              <StatCard
                icon="face"
                label="Photos uploaded"
                value={stats.photos.toLocaleString()}
                hint="Stored securely"
              />
              <StatCard
                icon="students"
                label="Participants"
                value={stats.participants.toLocaleString()}
                hint={`${stats.enrolled} faces submitted`}
              />
              <StatCard
                icon="delivery"
                label="Participants matched"
                value={stats.matched.toLocaleString()}
                hint={`${stats.delivered} galleries delivered`}
              />
            </div>
            <div className="two-col">
              <section className="card section">
                <div className="section-head">
                  <div>
                    <h3>Event operations</h3>
                    <p>Current progress from upload through delivery</p>
                  </div>
                  <a href="/organization/events" className="text-link">
                    View events
                  </a>
                </div>
                {events.length ? (
                  <div className="event-list">
                    {events.slice(0, 5).map((event) => (
                      <div className="event-list-row" key={event.id}>
                        <div className="date-tile">
                          <strong>
                            {new Date(`${event.date}T00:00:00`).getDate()}
                          </strong>
                          <span>
                            {new Date(`${event.date}T00:00:00`).toLocaleString(
                              "en",
                              { month: "short" },
                            )}
                          </span>
                        </div>
                        <div className="event-list-main">
                          <strong>{event.name}</strong>
                          <span>
                            {event.location || "No location"} ·{" "}
                            {event.photos.toLocaleString()} photos
                          </span>
                          <div className="progress-track">
                            <span
                              style={{
                                width: `${event.photos ? Math.min(100, (event.matched / Math.max(1, event.participants)) * 100) : 2}%`,
                              }}
                            />
                          </div>
                        </div>
                        <Badge status={event.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-note">
                    Create your first event to start the workflow.
                  </p>
                )}
              </section>
              <section className="card section">
                <div className="section-head">
                  <div>
                    <h3>Storage & retention</h3>
                    <p>Controlled by your FDX administrator</p>
                  </div>
                </div>
                <div className="gauge-row">
                  <Gauge
                    value={org.storageUsedGB}
                    max={org.storageLimitGB}
                    label="Storage used"
                    sublabel={`${org.storageUsedGB} GB`}
                  />
                  <Gauge
                    value={Math.max(0, org.storageLimitGB - org.storageUsedGB)}
                    max={org.storageLimitGB}
                    label="Available"
                    sublabel={`${Math.max(0, org.storageLimitGB - org.storageUsedGB)} GB`}
                  />
                </div>
                <div className="retention-callout">
                  <div>
                    <span>Next data expiry</span>
                    <strong>{org.nextDataExpiry ?? "No events"}</strong>
                  </div>
                  <div>
                    <span>Retention policy</span>
                    <strong>{org.retentionDays} days</strong>
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : null}
      </PageState>
    </div>
  );
}
