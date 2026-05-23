import type { Project, ProjectNode, AllDataResponse } from '@/types';

const BASE = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
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

  // Nodes
  getNodes: (projectId: string) =>
    fetchJSON<ProjectNode[]>(`${BASE}/nodes?projectId=${projectId}`),
  getNode: (id: string) =>
    fetchJSON<ProjectNode>(`${BASE}/nodes/${id}`),
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
    fetch(`${BASE}/nodes/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Export branch as table
  exportBranch: (id: string) =>
    fetchJSON<{ branchName: string; columns: string[]; rows: Record<string, unknown>[] }>(`${BASE}/nodes/${id}/export`),
};
