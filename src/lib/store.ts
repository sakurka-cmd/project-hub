'use client';

import { create } from 'zustand';
import type { Project, DashboardStats, AppView, Task, TaskCategory, Artifact, Credential, InfrastructureItem, Sprint } from '@/types';
import { api } from '@/lib/api';

interface AppState {
  // Navigation
  view: AppView;
  setView: (v: AppView) => void;
  selectedProjectId: string | null;
  selectProjectContext: (id: string) => Promise<void>;
  expandedProjects: Set<string>;
  toggleProject: (id: string) => void;

  // Data (unified — loaded once)
  projects: Project[];
  tasks: Task[];
  sprints: Sprint[];
  categories: TaskCategory[];
  artifacts: Artifact[];
  credentials: Credential[];
  infrastructure: InfrastructureItem[];

  // Dashboard
  dashboard: DashboardStats | null;

  // Loading
  loading: boolean;
  allDataLoaded: boolean;

  // Actions
  loadDashboard: () => Promise<void>;
  loadAllData: () => Promise<void>;
  loadProjectContext: (id: string) => Promise<void>;

  // Task actions
  createTask: (data: Partial<Task> & { projectId: string }) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Project actions
  createProject: (data: Partial<Project>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Category actions
  createCategory: (data: Partial<TaskCategory> & { projectId: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Sprint actions
  createSprint: (data: { name: string; startDate?: string | null; endDate?: string | null; status?: string; projectId: string }) => Promise<void>;
  updateSprint: (id: string, data: Partial<Sprint>) => Promise<void>;
  deleteSprint: (id: string) => Promise<void>;

  // Artifact actions
  createArtifact: (data: Partial<Artifact> & { projectId: string }) => Promise<void>;
  updateArtifact: (id: string, data: Partial<Artifact>) => Promise<void>;
  deleteArtifact: (id: string) => Promise<void>;

  // Credential actions
  createCredential: (data: Partial<Credential> & { projectId: string }) => Promise<void>;
  updateCredential: (id: string, data: Partial<Credential>) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;

  // Infrastructure actions
  createInfrastructure: (data: Partial<InfrastructureItem> & { projectId: string }) => Promise<void>;
  updateInfrastructure: (id: string, data: Partial<InfrastructureItem>) => Promise<void>;
  deleteInfrastructure: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  view: 'dashboard',
  setView: (v) => set({ view: v }),
  selectedProjectId: null,
  selectProjectContext: async (id) => {
    set({ selectedProjectId: id });
    await get().loadProjectContext(id);
  },
  expandedProjects: new Set<string>(),
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
  tasks: [],
  sprints: [],
  categories: [],
  artifacts: [],
  credentials: [],
  infrastructure: [],

  dashboard: null,
  loading: false,
  allDataLoaded: false,

  // Loaders
  loadDashboard: async () => {
    try {
      const data = await api.getDashboard();
      set({ dashboard: data });
    } catch (e) { console.error(e); }
  },

  loadAllData: async () => {
    set({ loading: true });
    try {
      const data = await api.getAllData();
      set({
        projects: data.projects,
        tasks: data.tasks,
        sprints: data.sprints,
        categories: data.categories,
        artifacts: data.artifacts,
        credentials: data.credentials,
        infrastructure: data.infrastructure,
        loading: false,
        allDataLoaded: true,
      });
    } catch (e) { set({ loading: false }); console.error(e); }
  },

  loadProjectContext: async (id: string) => {
    try {
      const [artifacts, credentials, infrastructure] = await Promise.all([
        api.getArtifacts(id),
        api.getCredentials(id),
        api.getInfrastructure(id),
      ]);
      set({ artifacts, credentials, infrastructure, selectedProjectId: id });
    } catch (e) { console.error(e); }
  },

  // Task CRUD
  createTask: async (data) => {
    await api.createTask(data);
    await get().loadAllData();
    await get().loadDashboard();
  },
  updateTask: async (id, data) => {
    await api.updateTask(id, data);
    await get().loadAllData();
    await get().loadDashboard();
  },
  deleteTask: async (id) => {
    await api.deleteTask(id);
    await get().loadAllData();
    await get().loadDashboard();
  },

  // Project CRUD
  createProject: async (data) => {
    await api.createProject(data);
    await get().loadAllData();
    await get().loadDashboard();
  },
  updateProject: async (id, data) => {
    await api.updateProject(id, data);
    await get().loadAllData();
    await get().loadDashboard();
  },
  deleteProject: async (id) => {
    await api.deleteProject(id);
    set({ selectedProjectId: null });
    await get().loadAllData();
    await get().loadDashboard();
  },

  // Category CRUD
  createCategory: async (data) => {
    await api.createCategory(data);
    await get().loadAllData();
  },
  deleteCategory: async (id) => {
    await api.deleteCategory(id);
    await get().loadAllData();
  },

  // Sprint CRUD
  createSprint: async (data) => {
    await api.createSprint(data);
    await get().loadAllData();
  },
  updateSprint: async (id, data) => {
    await api.updateSprint(id, data);
    await get().loadAllData();
  },
  deleteSprint: async (id) => {
    await api.deleteSprint(id);
    await get().loadAllData();
  },

  // Artifact CRUD
  createArtifact: async (data) => {
    await api.createArtifact(data);
    const pid = data.projectId || get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },
  updateArtifact: async (id, data) => {
    await api.updateArtifact(id, data);
    const pid = get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },
  deleteArtifact: async (id) => {
    await api.deleteArtifact(id);
    const pid = get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },

  // Credential CRUD
  createCredential: async (data) => {
    await api.createCredential(data);
    const pid = data.projectId || get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },
  updateCredential: async (id, data) => {
    await api.updateCredential(id, data);
    const pid = get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },
  deleteCredential: async (id) => {
    await api.deleteCredential(id);
    const pid = get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },

  // Infrastructure CRUD
  createInfrastructure: async (data) => {
    await api.createInfrastructure(data);
    const pid = data.projectId || get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },
  updateInfrastructure: async (id, data) => {
    await api.updateInfrastructure(id, data);
    const pid = get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },
  deleteInfrastructure: async (id) => {
    await api.deleteInfrastructure(id);
    const pid = get().selectedProjectId;
    if (pid) await get().loadProjectContext(pid);
  },
}));
