const TONE_BY_STATUS = {
  active: "success",
  processed: "success",
  matched: "success",
  ready: "success",
  delivered: "success",
  verified: "success",
  accepted: "success",
  healthy: "success",
  high: "success",
  inactive: "danger",
  suspended: "danger",
  failed: "danger",
  expired: "danger",
  low: "danger",
  "no-face": "danger",
  processing: "warning",
  pending: "warning",
  invited: "warning",
  preparing: "warning",
  degraded: "warning",
  review: "warning",
};

export default function Badge({ status, children }) {
  const tone = TONE_BY_STATUS[status] ?? "warning";
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {children ?? String(status).replaceAll("_", " ")}
    </span>
  );
}
