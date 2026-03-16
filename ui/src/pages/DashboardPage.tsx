import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

export function DashboardPage() {
  const { companyId } = useCompany();
  const { data: stats } = useApi(
    () => api.get<any>(`/companies/${companyId}/dashboard`),
    [companyId],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Agents" value={stats?.agents ?? "-"} />
        <StatCard label="Issues" value={stats?.issues ?? "-"} />
        <StatCard label="Projects" value={stats?.projects ?? "-"} />
        <StatCard label="Pending Registrations" value={stats?.pendingRegistrations ?? "-"} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
