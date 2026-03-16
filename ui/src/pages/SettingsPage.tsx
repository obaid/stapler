import { useCompany } from "../context/CompanyContext";

export function SettingsPage() {
  const { company } = useCompany();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        <h3 className="font-semibold mb-4">Company</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Name</dt>
            <dd>{company?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Issue Prefix</dt>
            <dd>{company?.issuePrefix}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Auto-approve Registrations</dt>
            <dd>{company?.autoApproveRegistrations ? "Yes" : "No"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">ID</dt>
            <dd className="font-mono text-xs">{company?.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
