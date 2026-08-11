import { useState } from "react";
import Badge from "../../components/Badge";
import Toggle from "../../components/Toggle";
import Gauge from "../../components/Gauge";
import { colleges as initialColleges } from "../../lib/mockData";
import "./Colleges.css";

export default function Colleges() {
  const [colleges, setColleges] = useState(initialColleges);
  const [selectedId, setSelectedId] = useState(initialColleges[0]?.id);

  const selected = colleges.find((c) => c.id === selectedId) ?? colleges[0];

  function updateCollege(id, patch) {
    setColleges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function toggleStatus(college) {
    updateCollege(college.id, { status: college.status === "active" ? "inactive" : "active" });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>College maintenance</h2>
          <p>Manage college accounts, storage quotas and access expiry.</p>
        </div>
      </div>

      <div className="two-col">
        <div className="card section colleges-table-section">
          <div className="section-head">
            <div>
              <h3>College users</h3>
              <p>{colleges.length} onboarded colleges</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Active</th>
                  <th>College</th>
                  <th>Users</th>
                  <th>Storage</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((college) => (
                  <tr
                    key={college.id}
                    className={college.id === selectedId ? "row-selected" : ""}
                    onClick={() => setSelectedId(college.id)}
                  >
                    <td onClick={(event) => event.stopPropagation()}>
                      <Toggle checked={college.status === "active"} onChange={() => toggleStatus(college)} />
                    </td>
                    <td>
                      <p className="college-name">{college.name}</p>
                      <span className="college-email">{college.contactEmail}</span>
                    </td>
                    <td>{college.users}</td>
                    <td>{college.storageUsedGB} / {college.storageLimitGB} GB</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="date"
                        className="pill-input"
                        value={college.expiry}
                        onChange={(event) => updateCollege(college.id, { expiry: event.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected ? (
          <div className="card section college-detail">
            <div className="section-head">
              <div>
                <h3>{selected.name}</h3>
                <p>Storage &amp; data cutoff</p>
              </div>
              <Badge status={selected.status} />
            </div>

            <div className="gauge-row">
              <Gauge
                value={selected.storageUsedGB}
                max={selected.storageLimitGB}
                label="Storage used"
                sublabel={`${selected.storageUsedGB} GB`}
              />
              <Gauge
                value={selected.storageLimitGB - selected.storageUsedGB}
                max={selected.storageLimitGB}
                label="Storage remaining"
                sublabel={`${selected.storageLimitGB - selected.storageUsedGB} GB`}
              />
            </div>

            <div className="detail-fields">
              <div className="field">
                <label htmlFor="storageLimit">Data cutoff (storage quota, GB)</label>
                <input
                  id="storageLimit"
                  type="number"
                  min={selected.storageUsedGB}
                  value={selected.storageLimitGB}
                  onChange={(event) =>
                    updateCollege(selected.id, { storageLimitGB: Number(event.target.value) })
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="expiryDetail">Access expiry</label>
                <input
                  id="expiryDetail"
                  type="date"
                  value={selected.expiry}
                  onChange={(event) => updateCollege(selected.id, { expiry: event.target.value })}
                />
              </div>

              <div className="detail-stat-row">
                <div>
                  <p className="detail-stat-label">Daily usage</p>
                  <p className="detail-stat-value">{selected.dailyUsageGB} GB</p>
                </div>
                <div>
                  <p className="detail-stat-label">Users</p>
                  <p className="detail-stat-value">{selected.users}</p>
                </div>
                <div>
                  <p className="detail-stat-label">Events</p>
                  <p className="detail-stat-value">{selected.events}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
