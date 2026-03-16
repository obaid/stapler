import { api } from "./client";

export const issuesApi = {
  list: (companyId: string) => api.get<any[]>(`/companies/${companyId}/issues`),
  get: (companyId: string, issueId: string) =>
    api.get<any>(`/companies/${companyId}/issues/${issueId}`),
  create: (companyId: string, data: any) =>
    api.post<any>(`/companies/${companyId}/issues`, data),
  update: (companyId: string, issueId: string, data: any) =>
    api.patch<any>(`/companies/${companyId}/issues/${issueId}`, data),
  comments: (companyId: string, issueId: string) =>
    api.get<any[]>(`/companies/${companyId}/issues/${issueId}/comments`),
  addComment: (companyId: string, issueId: string, body: string) =>
    api.post<any>(`/companies/${companyId}/issues/${issueId}/comments`, { body }),
};
