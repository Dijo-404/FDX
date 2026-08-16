import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import { usePlatform } from "../../context/PlatformContext";
import { useAuth } from "../../context/AuthContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";
export default function FaceMatches({ embedded = false }) {
  const { user } = useAuth();
  const { matches, matchStats, reviewMatch } = usePlatform();
  const [filter, setFilter] = useState("all");
  const visible = useMemo(
    () => matches.filter((row) => filter === "all" || row.state === filter),
    [filter, matches],
  );
  const matchesTable = useInfiniteScroll(visible, "Face match records");
  const stats = matchStats ?? {};
  return (
    <div className={embedded ? "face-matches-section" : "page"}>
      <div className={embedded ? "section-head" : "page-head"}>
        <div>
          <p className="eyebrow">Identity results</p>
          {embedded ? <h3>Face matches</h3> : <h2>Face matches</h2>}
          <p>
            Review database-indexed results before photographs enter private
            galleries.
          </p>
        </div>
      </div>
      <div className="stat-grid">
        {!embedded ? (
          <StatCard
            icon="face"
            label="Unique faces"
            value={stats.uniqueFaces ?? stats.facesDetected ?? 0}
            hint={`${stats.faceDetections ?? 0} detections indexed`}
          />
        ) : null}
        <StatCard
          icon="check"
          label="High confidence"
          value={stats.high ?? 0}
          hint="Auto-assigned"
        />
        <StatCard
          icon="health"
          label="Needs review"
          value={stats.review ?? 0}
          hint="65–84% similarity"
        />
        <StatCard
          icon="close"
          label="Unknown"
          value={stats.low ?? 0}
          hint="Below threshold"
        />
      </div>
      <div className="toolbar">
        <div className="segmented">
          {[
            ["all", "All matches"],
            ["high", "High confidence"],
            ["review", "Needs review"],
            ["low", "Unknown"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => {
                setFilter(value);
                matchesTable.reset();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="result-count">{visible.length} records</span>
      </div>
      <div
        className="card table-wrap infinite-scroll"
        {...matchesTable.scrollProps}
      >
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Participant</th>
              <th>Event</th>
              <th>Confidence</th>
              <th>Decision</th>
              <th>Matched at</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {matchesTable.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="photo-cell">
                    <div className="photo-placeholder">
                      <Icon name="face" size={18} />
                    </div>
                    <strong>{row.photo}</strong>
                  </div>
                </td>
                <td>{row.participant}</td>
                <td>{row.event}</td>
                <td>
                  <div className="confidence-meter">
                    <span>
                      <i style={{ width: `${row.confidence * 100}%` }} />
                    </span>
                    <strong>{Math.round(row.confidence * 100)}%</strong>
                  </div>
                </td>
                <td>
                  <Badge status={row.state}>
                    {row.state === "high"
                      ? "Auto match"
                      : row.state === "review"
                        ? "Review"
                        : row.state}
                  </Badge>
                </td>
                <td>{new Date(row.matchedAt).toLocaleString()}</td>
                <td>
                  {row.state === "review" && user?.role === "org_admin" ? (
                    <div className="row-actions">
                      <button
                        className="btn small primary"
                        onClick={() => reviewMatch(row.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="btn small"
                        onClick={() => reviewMatch(row.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length ? (
          <p className="empty-note">No matches in this confidence tier.</p>
        ) : null}
      </div>
    </div>
  );
}
