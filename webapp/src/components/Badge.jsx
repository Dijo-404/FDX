const TONE_BY_STATUS = {
  active: "success",
  processed: "success",
  matched: "success",
  inactive: "danger",
  "no-face": "danger",
  processing: "warning",
  pending: "warning",
};

export default function Badge({ status, children }) {
  const tone = TONE_BY_STATUS[status] ?? "warning";
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {children ?? status}
    </span>
  );
}
