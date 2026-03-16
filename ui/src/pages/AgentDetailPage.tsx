import { useParams } from "react-router-dom";
import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { agentsApi } from "../api/agents";
import { StatusBadge } from "../components/StatusBadge";

export function AgentDetailPage() {
  const { agentId } = useParams();
  const { companyId } = useCompany();
  const { data: agent } = useApi(
    () => agentsApi.get(companyId!, agentId!),
    [companyId, agentId],
  );

  if (!agent) return <div className="p-4">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">{agent.name}</h2>
        <StatusBadge status={agent.status} />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="font-semibold mb-4">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd>{agent.role}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Adapter</dt><dd>{agent.adapterType}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Poll Interval</dt><dd>{agent.pollingIntervalSec}s</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Budget</dt><dd>${(agent.budgetMonthlyCents / 100).toFixed(2)}/mo</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Spent</dt><dd>${(agent.spentMonthlyCents / 100).toFixed(2)}/mo</dd></div>
          </dl>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="font-semibold mb-4">Capabilities</h3>
          <p className="text-sm text-gray-600">{agent.capabilities || "No capabilities listed"}</p>
        </div>
      </div>
    </div>
  );
}
