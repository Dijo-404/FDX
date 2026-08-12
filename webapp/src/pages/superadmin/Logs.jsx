import LogsTable from "../../components/LogsTable";
import { superAdminLogs } from "../../lib/mockData";

export default function SuperAdminLogs() {
  return <LogsTable logs={superAdminLogs} title="Audit logs" subtitle="Platform-wide security, retention and administrative activity." />;
}
