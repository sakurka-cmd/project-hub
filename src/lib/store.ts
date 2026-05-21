'use client';

import { create } from 'zustand';
import type { Project, DashboardStats, AppView, ProjectTab, Task, TaskCategory, Artifact, Credential, InfrastructureItem, Sprint } from '@/types';
import { api } from '@/lib/api';

interface AppState {
  // Navigation
  view: AppView;
  setView: (v: AppView) => void;
  selectedProjectId: string | null;
  selectProject: (id: string) => void;
  projectTab: ProjectTab;
  setProjectTab: (t: ProjectTab) => void;

  // Data
  dashboard: DashboardStats | null;
  projects: Project[];
  currentProject: Project | null;
  tasks: Task[];
  categories: TaskCategory[];
  artifacts: Artifact[];
  credentials: Credential[];
  infrastructure: InfrastructureItem[];
  sprints: Sprint[];

  // Loading
  loading: boolean;

  // Actions
  loadDashboard: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadProjectDetail: (id: string) => Promise<void>;
  loadTasks: (projectId: string) => Promise<void>;
  loadCategories: (projectId: string) => Promise<void>;
  loadArtifacts: (projectId: string) => Promise<void>;
  loadCredentials: (projectId: string) => Promise<void>;
  loadInfrastructure: (projectId: string) => Promise<void>;
  loadSprints: (projectId: string) => Promise<void>;

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
  selectProject: (id) => {
    set({ selectedProjectId: id, view: 'project-detail' });
    get().loadProjectDetail(id);
  },
  projectTab: 'backlog',
  setProjectTab: (t) => set({ projectTab: t }),

  // Data
  dashboard: null,
  projects: [],
  currentProject: null,
  tasks: [],
  categories: [],
  artifacts: [],
  credentials: [],
  infrastructure: [],
  sprints: [],

  loading: false,

  // Loaders
  loadDashboard: async () => {
    try {
      const data = await api.getDashboard();
      set({ dashboard: data });
    } catch (e) { console.error(e); }
  },

  loadProjects: async () => {
    set({ loading: true });
    try {
      const data = await api.getProjects();
      set({ projects: data, loading: false });
    } catch (e) { set({ loading: false }); console.error(e); }
  },

  loadProjectDetail: async (id: string) => {
    set({ loading: true });
    try {
      const [project, tasks, categories, artifacts, credentials, infrastructure, sprints] = await Promise.all([
        api.getProject(id),
        api.getTasks({ projectId: id }),
        api.getCategories(id),
        api.getArtifacts(id),
        api.getCredentials(id),
        api.getInfrastructure(id),
        api.getSprints(id),
      ]);
      set({
        currentProject: project,
        tasks: tasks,
        categories: categories,
        artifacts: artifacts,
        credentials: credentials,
        infrastructure: infrastructure,
        sprints: sprints,
        loading: false,
      });
    } catch (e) { set({ loading: false }); console.error(e); }
  },

  loadTasks: async (projectId: string) => {
    try {
      const data = await api.getTasks({ projectId });
      set({ tasks: data });
    } catch (e) { console.error(e); }
  },

  loadCategories: async (projectId: string) => {
    try {
      const data = await api.getCategories(projectId);
      set({ categories: data });
    } catch (e) { console.error(e); }
  },

  loadArtifacts: async (projectId: string) => {
    try {
      const data = await api.getArtifacts(projectId);
      set({ artifacts: data });
    } catch (e) { console.error(e); }
  },

  loadCredentials: async (projectId: string) => {
    try {
      const data = await api.getCredentials(projectId);
      set({ credentials: data });
    } catch (e) { console.error(e); }
  },

  loadInfrastructure: async (projectId: string) => {
    try {
      const data = await api.getInfrastructure(projectId);
      set({ infrastructure: data });
    } catch (e) { console.error(e); }
  },

  loadSprints: async (projectId: string) => {
    try {
      const data = await api.getSprints(projectId);
      set({ sprints: data });
    } catch (e) { console.error(e); }
  },

  // Task CRUD
  createTask: async (data) => {
    await api.createTask(data);
    const pid = data.projectId || get().selectedProjectId;
    if (pid) await get().loadTasks(pid);
    await get().loadDashboard();
  },
  updateTask: async (id, data) => {
    await api.updateTask(id, data);
    const pid = get().selectedProjectId;
    if (pid) await get().loadTasks(pid);
    await get().loadDashboard();
  },
  deleteTask: async (id) => {
    await api.deleteTask(id);
    const pid = get().selectedProjectId;
    if (pid) {
      await get().loadTasks(pid);
      await get().loadSprints(pid);
    }
    await get().loadDashboard();
  },

  // Project CRUD
  createProject: async (data) => {
    await api.createProject(data);
    await get().loadProjects();
    await get().loadDashboard();
  },
  updateProject: async (id, data) => {
    await api.updateProject(id, data);
    await get().loadProjects();
    await get().loadDashboard();
    if (get().selectedProjectId === id) await get().loadProjectDetail(id);
  },
  deleteProject: async (id) => {
    await api.deleteProject(id);
    set({ view: 'projects', selectedProjectId: null, currentProject: null });
    await get().loadProjects();
    await get().loadDashboard();
  },

  // Category CRUD
  createCategory: async (data) => {
    await api.createCategory(data);
    await get().loadCategories(data.projectId);
  },
  deleteCategory: async (id) => {
    await api.deleteCategory(id);
    const pid = get().selectedProjectId;
    if (pid) await get().loadCategories(pid);
  },

  // Sprint CRUD
  createSprint: async (data) => {
    await api.createSprint(data);
    await get().loadSprints(data.projectId);
  },
  updateSprint: async (id, data) => {
    await api.updateSprint(id, data);
    const pid = get().selectedProjectId;
    if (pid) await get().loadSprints(pid);
  },
  deleteSprint: async (id) => {
    await api.deleteSprint(id);
    const pid = get().selectedProjectId;
    if (pid) {
      await get().loadSprints(pid);
      await get().loadTasks(pid);
    }
  },

  // Artifact CRUD
  createArtifact: async (data) => {
    await api.createArtifact(data);
    await get().loadArtifacts(data.projectId);
  },
  updateArtifact: async (id, data) => {
    await api.updateArtifact(id, data);
    const pid = get().selectedProjectId;
    if (pid) await get().loadArtifacts(pid);
  },
  deleteArtifact: async (id) => {
    await api.deleteArtifact(id);
    const pid = get().selectedProjectId;
    if (pid) await get().loadArtifacts(pid);
  },

  // Credential CRUD
  createCredential: async (data) => {
    await api.createCredential(data);
    await get().loadCredentials(data.projectId);
  },
  updateCredential: async (id, data) => {
    await api.updateCredential(id, data);
    const pid = get().selectedProjectId;
    if (pid) await get().loadCredentials(pid);
  },
  deleteCredential: async (id) => {
    await api.deleteCredential(id);
    const pid = get().selectedProjectId;
    if (pid) await get().loadCredentials(pid);
  },

  // Infrastructure CRUD
  createInfrastructure: async (data) => {
    await api.createInfrastructure(data);
    await get().loadInfrastructure(data.projectId);
  },
  updateInfrastructure: async (id, data) => {
    await api.updateInfrastructure(id, data);
    const pid = get().selectedProjectId;
    if (pid) await get().loadInfrastructure(pid);
  },
  deleteInfrastructure: async (id) => {
    await api.deleteInfrastructure(id);
    const pid = get().selectedProjectId;
    if (pid) await get().loadInfrastructure(pid);
  },
}));
