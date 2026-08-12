import LogsTable from "../../components/LogsTable";
import { organizationLogs } from "../../lib/mockData";
export default function OrganizationLogs(){return <LogsTable logs={organizationLogs} title="Audit logs" subtitle="Tenant-isolated upload, processing, matching and delivery activity."/>}
