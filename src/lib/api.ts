import type { Project, ProjectNode, AllDataResponse, FileAttachment } from '@/types';

const BASE = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ==================== AUTH ====================
  register: (data: { username: string; password: string }) =>
    fetchJSON<{ id: string; username: string; role: string }>(`${BASE}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  seedAdmin: () =>
    fetchJSON<{ message: string; username: string; password: string }>(`${BASE}/seed`, {
      method: 'POST',
    }),

  // ==================== SETTINGS ====================
  getSettings: () =>
    fetchJSON<Record<string, string>>(`${BASE}/settings`),

  updateSettings: (data: Record<string, string>) =>
    fetchJSON<{ success: boolean }>(`${BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ==================== FILES ====================
  uploadFile: async (nodeId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nodeId', nodeId);
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `API error: ${res.status}`);
    }
    return res.json() as Promise<FileAttachment>;
  },

  deleteFile: (id: string) =>
    fetch(`${BASE}/files/${id}`, { method: 'DELETE' }).then((r) => r.json()),

  getFileUrl: (id: string) => `/api/files/${id}`,

  // ==================== NODES: DUPLICATE ====================
  duplicateNode: (id: string) =>
    fetchJSON<ProjectNode>(`${BASE}/nodes/${id}/duplicate`, { method: 'POST' }),

  // ==================== ALL DATA (unified) ====================
  getAllData: () => fetchJSON<AllDataResponse>(`${BASE}/all-data`),

  // ==================== PROJECTS ====================
  getProjects: () => fetchJSON<Project[]>(`${BASE}/projects`),
  getProject: (id: string) => fetchJSON<Project>(`${BASE}/projects/${id}`),
  createProject: (data: Partial<Project>) =>
    fetchJSON<Project>(`${BASE}/projects`, { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    fetchJSON<Project>(`${BASE}/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    fetch(`${BASE}/projects/${id}`, { method: 'DELETE' }).then((r) => r.json()),

  // ==================== NODES ====================
  getNodes: (projectId: string) =>
    fetchJSON<ProjectNode[]>(`${BASE}/nodes?projectId=${projectId}`),
  getNode: (id: string) =>
    fetchJSON<ProjectNode & { attachments?: FileAttachment[] }>(`${BASE}/nodes/${id}`),
  createNode: (data: {
    projectId: string;
    parentId?: string | null;
    name: string;
    nodeType: 'branch' | 'item';
    branchType?: string | null;
    fields?: Record<string, unknown>;
    order?: number;
  }) =>
    fetchJSON<ProjectNode>(`${BASE}/nodes`, { method: 'POST', body: JSON.stringify(data) }),
  updateNode: (id: string, data: {
    name?: string;
    nodeType?: 'branch' | 'item';
    branchType?: string | null;
    fields?: Record<string, unknown>;
    order?: number;
    parentId?: string | null;
  }) =>
    fetchJSON<ProjectNode>(`${BASE}/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNode: (id: string) =>
    fetch(`${BASE}/nodes/${id}`, { method: 'DELETE' }).then((r) => r.json()),

  // ==================== EXPORT ====================
  exportBranch: (id: string) =>
    fetchJSON<{ branchName: string; columns: string[]; rows: Record<string, unknown>[] }>(`${BASE}/nodes/${id}/export`),
};
