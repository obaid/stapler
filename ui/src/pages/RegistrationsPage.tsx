import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";

export function RegistrationsPage() {
  const { companyId } = useCompany();
  const { data: registrations, refresh } = useApi(
    () => api.get<any[]>(`/companies/${companyId}/registrations`),
    [companyId],
  );

  const handleApprove = async (id: string) => {
    await api.post(`/register/${id}/approve`);
    refresh();
  };

  const handleReject = async (id: string) => {
    await api.post(`/register/${id}/reject`);
    refresh();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Agent Registrations</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {registrations?.map((r: any) => (
              <tr key={r.id}>
                <td className="px-6 py-4 font-medium">{r.agentName}</td>
                <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4">
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {registrations?.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No registrations</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
