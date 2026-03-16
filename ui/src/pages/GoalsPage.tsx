import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";

export function GoalsPage() {
  const { companyId } = useCompany();
  const { data: goals } = useApi(
    () => api.get<any[]>(`/companies/${companyId}/goals`),
    [companyId],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Goals</h2>
      <div className="space-y-3">
        {goals?.map((g: any) => (
          <div key={g.id} className="bg-white shadow rounded-lg p-4 flex justify-between items-center">
            <div>
              <h3 className="font-medium">{g.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{g.level} goal</p>
            </div>
            <StatusBadge status={g.status} />
          </div>
        ))}
        {goals?.length === 0 && <p className="text-gray-500 text-center py-8">No goals yet</p>}
      </div>
    </div>
  );
}
