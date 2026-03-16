import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

export function ActivityPage() {
  const { companyId } = useCompany();
  const { data: activity } = useApi(
    () => api.get<any[]>(`/companies/${companyId}/activity?limit=100`),
    [companyId],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Activity</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {activity?.map((a: any) => (
            <div key={a.id} className="px-6 py-3 flex justify-between items-center">
              <div>
                <span className="text-sm font-medium">{a.actorType}:{a.actorId}</span>
                <span className="text-sm text-gray-500 mx-2">{a.action}</span>
                <span className="text-sm">{a.entityType}:{a.entityId?.slice(0, 8)}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {activity?.length === 0 && (
            <p className="px-6 py-8 text-center text-gray-500">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
