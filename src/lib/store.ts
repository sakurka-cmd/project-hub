'use client';

import { create } from 'zustand';
import type { Project, ProjectNode } from '@/types';
import { api } from '@/lib/api';

interface AppState {
  // Navigation
  selectedProjectId: string | null;
  expandedProjects: Set<string>;
  selectProject: (id: string) => void;
  toggleProject: (id: string) => void;

  // Data
  projects: Project[];
  nodes: ProjectNode[];
  loading: boolean;

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
  loading: false,

  // Loaders
  loadAllData: async () => {
    set({ loading: true });
    try {
      const data = await api.getAllData();
      set({
        projects: data.projects,
        nodes: data.nodes,
        loading: false,
      });
    } catch (e) { set({ loading: false }); console.error(e); }
  },

  // Project CRUD
  createProject: async (data) => {
    await api.createProject(data);
    await get().loadAllData();
  },
  updateProject: async (id, data) => {
    await api.updateProject(id, data);
    await get().loadAllData();
  },
  deleteProject: async (id) => {
    await api.deleteProject(id);
    set({ selectedProjectId: null });
    await get().loadAllData();
  },

  // Node CRUD
  createNode: async (data) => {
    await api.createNode(data);
    await get().loadAllData();
  },
  updateNode: async (id, data) => {
    await api.updateNode(id, data);
    await get().loadAllData();
  },
  deleteNode: async (id) => {
    await api.deleteNode(id);
    await get().loadAllData();
  },
}));
