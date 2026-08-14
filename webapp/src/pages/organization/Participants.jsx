import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Dropzone from "../../components/Dropzone";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import StatCard from "../../components/StatCard";
import { usePlatform } from "../../context/PlatformContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";
export default function Participants() {
  const {
    events,
    participants,
    validateParticipantImport,
    confirmParticipantImport,
  } = usePlatform();
  const [eventId, setEventId] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [queued, setQueued] = useState(null);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);
  const selectedEvent = eventId || events[0]?.id || "";
  const visible = useMemo(
    () =>
      participants.filter(
        (p) =>
          (!eventId || p.eventId === eventId) &&
          `${p.name} ${p.email}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [eventId, participants, query],
  );
  const participantsTable = useInfiniteScroll(visible, "Participant records");
  const verified = participants.filter(
    (p) => p.enrollment === "verified",
  ).length;
  const invited = participants.filter((p) => p.enrollment === "invited").length;
  async function runImport() {
    if (!queued || !selectedEvent) return;
    if (!preview) {
      const result = await validateParticipantImport(selectedEvent, queued);
      setPreview(result);
      return;
    }
    const result = await confirmParticipantImport(selectedEvent, preview.id);
    setNotice(
      `${result.participants_created} participants imported and invitations queued`,
    );
    setQueued(null);
    setPreview(null);
    setOpen(false);
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Identity enrollment</p>
          <h2>Participants</h2>
          <p>Import attendees and track consent-based face enrollment.</p>
        </div>
        <button
          className="btn primary"
          disabled={!events.length}
          onClick={() => setOpen(true)}
        >
          <Icon name="upload" size={16} /> Import participants
        </button>
      </div>
      {notice ? (
        <div className="notice success">
          <Icon name="check" size={16} />
          {notice}
        </div>
      ) : null}
      <div className="stat-grid">
        <StatCard
          icon="students"
          label="Participants"
          value={participants.length}
          hint="Across all events"
        />
        <StatCard
          icon="mail"
          label="Awaiting enrollment"
          value={invited}
          hint="Secure invitations sent"
        />
        <StatCard
          icon="face"
          label="Faces submitted"
          value={verified}
          hint="Embeddings stored"
        />
        <StatCard
          icon="delivery"
          label="Galleries delivered"
          value={participants.filter((p) => p.delivery === "delivered").length}
          hint="Expiring private links"
        />
      </div>
      <div className="toolbar">
        <select
          value={eventId}
          onChange={(event) => {
            setEventId(event.target.value);
            participantsTable.reset();
          }}
        >
          <option value="">All events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
        <div className="toolbar-search">
          <Icon name="search" size={15} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              participantsTable.reset();
            }}
            placeholder="Search name or email"
          />
        </div>
        <span className="result-count">{visible.length} participants</span>
      </div>
      <div
        className="card table-wrap infinite-scroll"
        {...participantsTable.scrollProps}
      >
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Event</th>
              <th>Enrollment</th>
              <th>Matches</th>
              <th>Delivery</th>
              <th>Imported</th>
            </tr>
          </thead>
          <tbody>
            {participantsTable.rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="table-identity">
                    <span className="person-avatar">
                      {p.name
                        .split(" ")
                        .map((x) => x[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <strong>{p.name}</strong>
                      <span>{p.email}</span>
                    </div>
                  </div>
                </td>
                <td>{p.event}</td>
                <td>
                  <Badge status={p.enrollment} />
                </td>
                <td>{p.matches}</td>
                <td>
                  <Badge status={p.delivery} />
                </td>
                <td>
                  {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length ? (
          <p className="empty-note">No participants found.</p>
        ) : null}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import participants"
        description="CSV or Excel columns: Name, Email. Duplicates are validated before import."
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={!queued || !selectedEvent}
              onClick={runImport}
            >
              {preview ? "Confirm import" : "Validate import"}
            </button>
          </>
        }
      >
        <div className="form-grid single">
          <div className="field">
            <label>Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => setEventId(e.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <Dropzone
            title="Add participant list"
            hint="Drop .csv, .xlsx or click to browse"
            accept=".csv,.xls,.xlsx,.xlsm"
            multiple={false}
            onFiles={(files) => {
              setQueued(files[0]);
              setPreview(null);
            }}
          />
          {queued ? (
            <div className="validation-summary">
              <Icon name="check" size={17} />
              <div>
                <strong>{queued.name}</strong>
                <p>Ready for server-side validation</p>
              </div>
            </div>
          ) : null}
          {preview ? (
            <div
              className={
                preview.invalid_rows ? "notice warning" : "notice success"
              }
            >
              {preview.valid_rows} valid · {preview.duplicate_rows} duplicate ·{" "}
              {preview.invalid_rows} invalid
              {preview.errors?.slice(0, 5).map((row) => (
                <p key={row.row}>
                  Row {row.row}: {row.errors.join(", ")}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
