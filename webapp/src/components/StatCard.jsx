import Icon from "./Icon";
import "./StatCard.css";

export default function StatCard({ icon, label, value, hint }) {
  return (
    <div className="stat-card card">
      <div className="stat-card-icon">
        <Icon name={icon} size={19} />
      </div>
      <div>
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        {hint ? <p className="stat-card-hint">{hint}</p> : null}
      </div>
    </div>
  );
}
