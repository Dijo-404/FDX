import { useMemo, useState } from "react";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import { usePlatform } from "../../context/PlatformContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";
export default function FaceMatches({ embedded = false }) {
  const { matches, matchStats } = usePlatform();
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
            Only matches that pass the strict automatic confidence policy enter
            private galleries.
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
            ["high", "Automatically approved"],
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
                      ? "Approved automatically"
                      : "Below threshold"}
                  </Badge>
                </td>
                <td>{new Date(row.matchedAt).toLocaleString()}</td>
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
