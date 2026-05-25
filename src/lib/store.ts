'use client';

import { create } from 'zustand';
import type { Project, ProjectNode, ElementType } from '@/types';
import { api } from '@/lib/api';
import { signOut } from 'next-auth/react';

interface CurrentUser {
  id: string;
  username: string;
  role: string;
}

interface AppState {
  // Navigation
  selectedProjectId: string | null;
  expandedProjects: Set<string>;
  selectProject: (id: string) => void;
  toggleProject: (id: string) => void;

  // Data
  projects: Project[];
  nodes: ProjectNode[];
  elementTypes: ElementType[];
  loading: boolean;

  // Current user
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  logout: () => Promise<void>;

  // Actions
  loadAllData: () => Promise<void>;

  // Project actions
  createProject: (data: Partial<Project>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Node actions
  createNode: (data: {
    projectId: string;
    parentId?: string | null;
    name: string;
    nodeType: 'branch' | 'item';
    branchType?: string | null;
    elementTypeId?: string | null;
    fields?: Record<string, unknown>;
    order?: number;
  }) => Promise<void>;
  updateNode: (id: string, data: {
    name?: string;
    nodeType?: 'branch' | 'item';
    branchType?: string | null;
    fields?: Record<string, unknown>;
    order?: number;
    parentId?: string | null;
  }) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
}

// Check if an error is caused by an invalid/missing session
function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('Не авторизован') || msg.includes('API error: 401');
}

// Wrap an async action with session expiry handling
async function withAuthCheck<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isAuthError(err)) {
      // Session expired or invalid — redirect to login
      await signOut({ callbackUrl: '/login' });
      throw new Error('Сессия истекла. Войдите заново.');
    }
    throw err;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  selectedProjectId: null,
  expandedProjects: new Set<string>(),
  selectProject: (id) => {
    set((s) => {
      const next = new Set(s.expandedProjects);
      next.add(id);
      return { selectedProjectId: id, expandedProjects: next };
    });
  },
  toggleProject: (id) => {
    set((s) => {
      const next = new Set(s.expandedProjects);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedProjects: next };
    });
  },

  // Data
  projects: [],
  nodes: [],
  elementTypes: [],
  loading: false,

  // Current user
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: async () => {
    set({ currentUser: null });
    await signOut({ callbackUrl: '/login' });
  },

  // Loaders
  loadAllData: async () => {
    set({ loading: true });
    try {
      const data = await withAuthCheck(() => api.getAllData());
      set({
        projects: data.projects,
        nodes: data.nodes,
        elementTypes: data.elementTypes || [],
        loading: false,
      });
    } catch (e) {
      set({ loading: false });
      console.error('loadAllData error:', e);
      throw e;
    }
  },

  // Project CRUD
  createProject: async (data) => {
    await withAuthCheck(() => api.createProject(data));
    await get().loadAllData();
  },
  updateProject: async (id, data) => {
    await withAuthCheck(() => api.updateProject(id, data));
    await get().loadAllData();
  },
  deleteProject: async (id) => {
    await withAuthCheck(() => api.deleteProject(id));
    set({ selectedProjectId: null });
    await get().loadAllData();
  },

  // Node CRUD
  createNode: async (data) => {
    await withAuthCheck(() => api.createNode(data));
    await get().loadAllData();
  },
  updateNode: async (id, data) => {
    await withAuthCheck(() => api.updateNode(id, data));
    await get().loadAllData();
  },
  deleteNode: async (id) => {
    await withAuthCheck(() => api.deleteNode(id));
    await get().loadAllData();
  },
}));
