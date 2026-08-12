import "./Gauge.css";

let gaugeId = 0;

export default function Gauge({ value, max, size = 108, strokeWidth = 10, label, sublabel }) {
  const id = nextGaugeId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="gauge" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#533afd" />
            <stop offset="100%" stopColor="#665efd" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="47%" textAnchor="middle" className="gauge-value">
          {Math.round(pct * 100)}%
        </text>
        <text x="50%" y="63%" textAnchor="middle" className="gauge-sublabel">
          {sublabel}
        </text>
      </svg>
      {label ? <p className="gauge-label">{label}</p> : null}
    </div>
  );
}

function nextGaugeId() {
  gaugeId += 1;
  return `gauge-gradient-${gaugeId}`;
}
