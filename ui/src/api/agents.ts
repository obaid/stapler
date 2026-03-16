import { api } from "./client";

export const agentsApi = {
  list: (companyId: string) => api.get<any[]>(`/companies/${companyId}/agents`),
  get: (companyId: string, agentId: string) =>
    api.get<any>(`/companies/${companyId}/agents/${agentId}`),
  create: (companyId: string, data: any) =>
    api.post<any>(`/companies/${companyId}/agents`, data),
  update: (companyId: string, agentId: string, data: any) =>
    api.patch<any>(`/companies/${companyId}/agents/${agentId}`, data),
  createKey: (companyId: string, agentId: string, name: string) =>
    api.post<any>(`/companies/${companyId}/agents/${agentId}/keys`, { name }),
};
