import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

export function CostsPage() {
  const { companyId } = useCompany();
  const { data: summary } = useApi(
    () => api.get<any>(`/companies/${companyId}/costs/summary`),
    [companyId],
  );
  const { data: events } = useApi(
    () => api.get<any[]>(`/companies/${companyId}/costs?limit=50`),
    [companyId],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Costs</h2>
      {summary && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-500">Company Budget</p>
            <p className="text-2xl font-bold">${(summary.company.budgetMonthlyCents / 100).toFixed(2)}/mo</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-500">Company Spent</p>
            <p className="text-2xl font-bold">${(summary.company.spentMonthlyCents / 100).toFixed(2)}/mo</p>
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold mb-4">Recent Cost Events</h3>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {events?.map((e: any) => (
              <tr key={e.id}>
                <td className="px-6 py-4 text-sm">{e.provider}</td>
                <td className="px-6 py-4 text-sm">{e.model}</td>
                <td className="px-6 py-4 text-sm">{e.inputTokens + e.outputTokens}</td>
                <td className="px-6 py-4 text-sm">${(e.costCents / 100).toFixed(4)}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{new Date(e.occurredAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
