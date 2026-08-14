import { useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import { usePlatform } from "../../context/PlatformContext";
import { useAuth } from "../../context/AuthContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";
export default function Deliveries() {
  const { user } = useAuth();
  const { deliveries, deliveryStats, sendDelivery } = usePlatform();
  const [notice, setNotice] = useState("");
  const stats = deliveryStats ?? {};
  const deliveriesTable = useInfiniteScroll(deliveries, "Gallery deliveries");
  async function send(row) {
    const result = await sendDelivery(row.participantId);
    setNotice(
      result.developmentGalleryUrl
        ? `Gallery delivered. Development link: ${result.developmentGalleryUrl}`
        : `Gallery delivered to ${row.participant}`,
    );
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Private galleries</p>
          <h2>Deliveries</h2>
          <p>
            Send each participant an expiring link to only their approved
            photos.
          </p>
        </div>
      </div>
      {notice ? (
        <div className="notice success">
          <Icon name="check" size={16} />
          {notice}
        </div>
      ) : null}
      <div className="stat-grid">
        <StatCard
          icon="delivery"
          label="Delivered"
          value={stats.delivered ?? 0}
          hint="Email provider accepted"
        />
        <StatCard
          icon="face"
          label="Ready to send"
          value={stats.ready ?? 0}
          hint="Galleries generated"
        />
        <StatCard
          icon="health"
          label="Failed"
          value={stats.failed ?? 0}
          hint="Retry available"
        />
        <StatCard
          icon="events"
          label="Total galleries"
          value={deliveries.length}
          hint="Event retention enforced"
        />
      </div>
      <div
        className="card table-wrap infinite-scroll"
        {...deliveriesTable.scrollProps}
      >
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Event</th>
              <th>Photos</th>
              <th>Gallery expiry</th>
              <th>Status</th>
              <th>Sent</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deliveriesTable.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.participant}</td>
                <td>{row.event}</td>
                <td>{row.photos}</td>
                <td>
                  {row.expires
                    ? new Date(row.expires).toLocaleDateString()
                    : "—"}
                </td>
                <td>
                  <Badge status={row.status} />
                </td>
                <td>
                  {row.sentAt ? new Date(row.sentAt).toLocaleString() : "—"}
                </td>
                <td>
                  {row.status === "ready" && user?.role === "org_admin" ? (
                    <button
                      className="btn primary small"
                      onClick={() => send(row)}
                    >
                      Send gallery
                    </button>
                  ) : row.status === "failed" && user?.role === "org_admin" ? (
                    <button className="btn small" onClick={() => send(row)}>
                      Retry
                    </button>
                  ) : (
                    <span>Sent</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!deliveries.length ? (
          <p className="empty-note">
            Galleries appear after high-confidence matches are processed.
          </p>
        ) : null}
      </div>
    </div>
  );
}
