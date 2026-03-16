import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";

export function ProjectsPage() {
  const { companyId } = useCompany();
  const { data: projects } = useApi(
    () => api.get<any[]>(`/companies/${companyId}/projects`),
    [companyId],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((p: any) => (
          <div key={p.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{p.name}</h3>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{p.description || "No description"}</p>
          </div>
        ))}
        {projects?.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-8">No projects yet</p>
        )}
      </div>
    </div>
  );
}
