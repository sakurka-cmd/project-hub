import type {
  Project, Task, TaskCategory, Artifact, Credential,
  InfrastructureItem, DashboardStats, Sprint, AllDataResponse
} from '@/types';

const BASE = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ==================== PROJECTS ====================
export const api = {
  // Dashboard
  getDashboard: () => fetchJSON<DashboardStats>(`${BASE}/dashboard`),

  // All data (unified)
  getAllData: () => fetchJSON<AllDataResponse>(`${BASE}/all-data`),

  // Projects
  getProjects: () => fetchJSON<Project[]>(`${BASE}/projects`),
  getProject: (id: string) => fetchJSON<Project>(`${BASE}/projects/${id}`),
  createProject: (data: Partial<Project>) =>
    fetchJSON<Project>(`${BASE}/projects`, { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    fetchJSON<Project>(`${BASE}/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    fetch(`${BASE}/projects/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Categories
  getCategories: (projectId: string) =>
    fetchJSON<TaskCategory[]>(`${BASE}/categories?projectId=${projectId}`),
  createCategory: (data: Partial<TaskCategory> & { projectId: string }) =>
    fetchJSON<TaskCategory>(`${BASE}/categories`, { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Partial<TaskCategory>) =>
    fetchJSON<TaskCategory>(`${BASE}/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    fetch(`${BASE}/categories/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Tasks
  getTasks: (params?: { projectId?: string; status?: string; categoryId?: string; parentId?: string | null; sprintId?: string; workItemType?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    if (params?.status) qs.set('status', params.status);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.parentId !== undefined) qs.set('parentId', params.parentId);
    if (params?.sprintId) qs.set('sprintId', params.sprintId);
    if (params?.workItemType) qs.set('workItemType', params.workItemType);
    return fetchJSON<Task[]>(`${BASE}/tasks?${qs}`);
  },
  createTask: (data: Partial<Task> & { projectId: string }) =>
    fetchJSON<Task>(`${BASE}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task>) =>
    fetchJSON<Task>(`${BASE}/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Sprints
  getSprints: (projectId: string) =>
    fetchJSON<Sprint[]>(`${BASE}/sprints?projectId=${projectId}`),
  createSprint: (data: { name: string; startDate?: string | null; endDate?: string | null; status?: string; projectId: string }) =>
    fetchJSON<Sprint>(`${BASE}/sprints`, { method: 'POST', body: JSON.stringify(data) }),
  updateSprint: (id: string, data: Partial<Sprint>) =>
    fetchJSON<Sprint>(`${BASE}/sprints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSprint: (id: string) =>
    fetch(`${BASE}/sprints/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Artifacts
  getArtifacts: (projectId: string) =>
    fetchJSON<Artifact[]>(`${BASE}/artifacts?projectId=${projectId}`),
  createArtifact: (data: Partial<Artifact> & { projectId: string }) =>
    fetchJSON<Artifact>(`${BASE}/artifacts`, { method: 'POST', body: JSON.stringify(data) }),
  updateArtifact: (id: string, data: Partial<Artifact>) =>
    fetchJSON<Artifact>(`${BASE}/artifacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArtifact: (id: string) =>
    fetch(`${BASE}/artifacts/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Credentials
  getCredentials: (projectId: string) =>
    fetchJSON<Credential[]>(`${BASE}/credentials?projectId=${projectId}`),
  createCredential: (data: Partial<Credential> & { projectId: string }) =>
    fetchJSON<Credential>(`${BASE}/credentials`, { method: 'POST', body: JSON.stringify(data) }),
  updateCredential: (id: string, data: Partial<Credential>) =>
    fetchJSON<Credential>(`${BASE}/credentials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCredential: (id: string) =>
    fetch(`${BASE}/credentials/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Infrastructure
  getInfrastructure: (projectId: string) =>
    fetchJSON<InfrastructureItem[]>(`${BASE}/infrastructure?projectId=${projectId}`),
  createInfrastructure: (data: Partial<InfrastructureItem> & { projectId: string }) =>
    fetchJSON<InfrastructureItem>(`${BASE}/infrastructure`, { method: 'POST', body: JSON.stringify(data) }),
  updateInfrastructure: (id: string, data: Partial<InfrastructureItem>) =>
    fetchJSON<InfrastructureItem>(`${BASE}/infrastructure/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInfrastructure: (id: string) =>
    fetch(`${BASE}/infrastructure/${id}`, { method: 'DELETE' }).then(r => r.json()),
};
