import LogsTable from "../../components/LogsTable";
import { collegeLogs } from "../../lib/mockData";

export default function CollegeLogs() {
  return <LogsTable logs={collegeLogs} title="Logs" subtitle="Upload and processing activity for your college." />;
}
