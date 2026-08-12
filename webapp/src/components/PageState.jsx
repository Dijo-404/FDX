export default function PageState({ loading, error, empty, children }) {
  if (loading) return <div className="page-state card"><span className="state-spinner" /><strong>Loading live FDX data…</strong></div>;
  if (error) return <div className="page-state card error"><strong>Unable to load this workspace</strong><p>{error}</p></div>;
  if (empty) return <div className="page-state card"><strong>No records yet</strong><p>Create the first record to begin this workflow.</p></div>;
  return children;
}
