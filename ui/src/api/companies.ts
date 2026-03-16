import { api } from "./client";

export const companiesApi = {
  list: () => api.get<any[]>("/companies"),
  get: (id: string) => api.get<any>(`/companies/${id}`),
  create: (data: { name: string; description?: string }) => api.post<any>("/companies", data),
};
