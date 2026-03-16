import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { AgentsPage } from "./pages/AgentsPage";
import { AgentDetailPage } from "./pages/AgentDetailPage";
import { IssuesPage } from "./pages/IssuesPage";
import { IssueDetailPage } from "./pages/IssueDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { RegistrationsPage } from "./pages/RegistrationsPage";
import { ActivityPage } from "./pages/ActivityPage";
import { CostsPage } from "./pages/CostsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CompanyProvider, useCompany } from "./context/CompanyContext";

function AppRoutes() {
  const { companyId } = useCompany();
  if (!companyId) return <div className="p-8">Loading...</div>;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/issues/:issueId" element={<IssueDetailPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/registrations" element={<RegistrationsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/costs" element={<CostsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <CompanyProvider>
      <AppRoutes />
    </CompanyProvider>
  );
}
