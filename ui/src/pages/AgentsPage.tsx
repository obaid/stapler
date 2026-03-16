import { Link } from "react-router-dom";
import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { agentsApi } from "../api/agents";
import { StatusBadge } from "../components/StatusBadge";

export function AgentsPage() {
  const { companyId } = useCompany();
  const { data: agents, refresh } = useApi(
    () => agentsApi.list(companyId!),
    [companyId],
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Agents</h2>
      </div>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Heartbeat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {agents?.map((agent: any) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/agents/${agent.id}`} className="text-blue-600 hover:underline font-medium">
                    {agent.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{agent.role}</td>
                <td className="px-6 py-4"><StatusBadge status={agent.status} /></td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).toLocaleString() : "Never"}
                </td>
              </tr>
            ))}
            {agents?.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No agents yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
