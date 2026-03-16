import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useCompany } from "../context/CompanyContext";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "grid" },
  { path: "/agents", label: "Agents", icon: "cpu" },
  { path: "/issues", label: "Issues", icon: "list" },
  { path: "/projects", label: "Projects", icon: "folder" },
  { path: "/goals", label: "Goals", icon: "target" },
  { path: "/registrations", label: "Registrations", icon: "user-plus" },
  { path: "/activity", label: "Activity", icon: "clock" },
  { path: "/costs", label: "Costs", icon: "dollar-sign" },
  { path: "/settings", label: "Settings", icon: "settings" },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { company } = useCompany();

  return (
    <div className="flex h-screen">
      <nav className="w-56 bg-gray-900 text-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold text-white">Stapler</h1>
          {company && (
            <p className="text-xs text-gray-500 mt-1 truncate">{company.name}</p>
          )}
        </div>
        <div className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-2 text-sm ${
                  active
                    ? "bg-gray-800 text-white border-l-2 border-blue-500"
                    : "hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
