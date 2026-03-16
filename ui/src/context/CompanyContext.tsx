import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { companiesApi } from "../api/companies";

interface CompanyContextValue {
  companyId: string | null;
  company: any;
  companies: any[];
  setCompanyId: (id: string) => void;
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue>({
  companyId: null,
  company: null,
  companies: [],
  setCompanyId: () => {},
  refresh: async () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const refresh = async () => {
    const list = await companiesApi.list();
    setCompanies(list);
    if (list.length > 0 && !companyId) {
      setCompanyId(list[0].id);
    }
  };

  useEffect(() => {
    refresh().catch(() => {
      // Auto-create a default company if none exists
      companiesApi
        .create({ name: "Default", description: "Auto-created workspace" })
        .then(() => refresh());
    });
  }, []);

  const company = companies.find((c) => c.id === companyId) ?? null;

  return (
    <CompanyContext.Provider value={{ companyId, company, companies, setCompanyId, refresh }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
