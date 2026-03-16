import { Link } from "react-router-dom";
import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { issuesApi } from "../api/issues";
import { StatusBadge } from "../components/StatusBadge";

export function IssuesPage() {
  const { companyId } = useCompany();
  const { data: issues } = useApi(() => issuesApi.list(companyId!), [companyId]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Issues</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {issues?.map((issue: any) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-gray-500">{issue.identifier}</td>
                <td className="px-6 py-4">
                  <Link to={`/issues/${issue.id}`} className="text-blue-600 hover:underline">
                    {issue.title}
                  </Link>
                </td>
                <td className="px-6 py-4"><StatusBadge status={issue.status} /></td>
                <td className="px-6 py-4"><StatusBadge status={issue.priority} /></td>
              </tr>
            ))}
            {issues?.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No issues yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
