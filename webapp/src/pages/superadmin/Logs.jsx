import LogsTable from "../../components/LogsTable";
import { superAdminLogs } from "../../lib/mockData";

export default function SuperAdminLogs() {
  return <LogsTable logs={superAdminLogs} title="Logs" subtitle="Platform-wide activity across all colleges." />;
}
