import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import { usePlatform } from "../../context/PlatformContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";

export default function EmailOutbox({ embedded = false }) {
  const { emails, retryEmail } = usePlatform();
  const emailsTable = useInfiniteScroll(emails, "Email delivery records");
  return (
    <section
      id={embedded ? "email-delivery" : undefined}
      className={embedded ? "email-outbox-section" : "page"}
    >
      <div className={embedded ? "section-head" : "page-head"}>
        <div>
          <p className="eyebrow">Notification service</p>
          {embedded ? <h3>Email delivery</h3> : <h2>Email delivery</h2>}
          <p>
            Persistent delivery history for invitations, enrollment links, and
            private galleries.
          </p>
        </div>
      </div>
      <div
        className="card table-wrap infinite-scroll"
        {...emailsTable.scrollProps}
      >
        <table>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Sent / next attempt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {emailsTable.rows.map((email) => (
              <tr key={email.id}>
                <td>{email.recipient}</td>
                <td>
                  <strong>{email.subject}</strong>
                  {email.error ? (
                    <span className="table-error">{email.error}</span>
                  ) : null}
                </td>
                <td>{email.provider}</td>
                <td>
                  <Badge status={email.status} />
                </td>
                <td>{email.attempts}</td>
                <td>
                  {email.sentAt
                    ? new Date(email.sentAt).toLocaleString()
                    : email.nextAttemptAt
                      ? new Date(email.nextAttemptAt).toLocaleString()
                      : "—"}
                </td>
                <td>
                  {email.status === "failed" ? (
                    <button
                      className="btn small"
                      onClick={() => retryEmail(email.id)}
                    >
                      <Icon name="processing" size={14} /> Retry
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!emails.length ? (
          <p className="empty-note">No email has been queued.</p>
        ) : null}
      </div>
    </section>
  );
}
