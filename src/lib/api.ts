import type { Project, ProjectNode, ElementType, TaskType, AllDataResponse, FileAttachment } from '@/types';

const BASE = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ==================== AUTH ====================
  getMe: () =>
    fetchJSON<{ id: string; username: string; role: string }>(`${BASE}/me`),

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
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData, credentials: 'include' });
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
    nodeType: 'branch' | 'item' | 'task' | 'protocol';
    branchType?: string | null;
    elementTypeId?: string | null;
    taskTypeId?: string | null;
    fields?: Record<string, unknown>;
    order?: number;
  }) =>
    fetchJSON<ProjectNode>(`${BASE}/nodes`, { method: 'POST', body: JSON.stringify(data) }),
  updateNode: (id: string, data: {
    name?: string;
    nodeType?: 'branch' | 'item' | 'task' | 'protocol';
    branchType?: string | null;
    fields?: Record<string, unknown>;
    order?: number;
    parentId?: string | null;
    completed?: boolean;
    taskTypeId?: string | null;
  }) =>
    fetchJSON<ProjectNode>(`${BASE}/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNode: (id: string) =>
    fetch(`${BASE}/nodes/${id}`, { method: 'DELETE' }).then((r) => r.json()),

  // ==================== EXPORT ====================
  exportBranch: (id: string) =>
    fetchJSON<{ branchName: string; columns: string[]; rows: Record<string, unknown>[] }>(`${BASE}/nodes/${id}/export`),

  // ==================== ELEMENT TYPES ====================
  getElementTypes: () => fetchJSON<ElementType[]>(`${BASE}/element-types`),
  createElementType: (data: Partial<ElementType>) =>
    fetchJSON<ElementType>(`${BASE}/element-types`, { method: 'POST', body: JSON.stringify(data) }),
  updateElementType: (id: string, data: Partial<ElementType>) =>
    fetchJSON<ElementType>(`${BASE}/element-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteElementType: (id: string) =>
    fetch(`${BASE}/element-types/${id}`, { method: 'DELETE' }).then((r) => r.json()),

  // ==================== TASK TYPES ====================
  getTaskTypes: () => fetchJSON<TaskType[]>(`${BASE}/task-types`),
  createTaskType: (data: Partial<TaskType>) =>
    fetchJSON<TaskType>(`${BASE}/task-types`, { method: 'POST', body: JSON.stringify(data) }),
  updateTaskType: (id: string, data: Partial<TaskType>) =>
    fetchJSON<TaskType>(`${BASE}/task-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTaskType: (id: string) =>
    fetch(`${BASE}/task-types/${id}`, { method: 'DELETE' }).then((r) => r.json()),
};
