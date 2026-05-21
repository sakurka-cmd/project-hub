// ==================== ПРОЕКТЫ ====================
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  color: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  _count?: { tasks: number };
  categories?: TaskCategory[];
  tasks?: Task[];
  artifacts?: Artifact[];
  credentials?: Credential[];
  infrastructure?: InfrastructureItem[];
  sprints?: Sprint[];
}

// ==================== СПРИНТЫ ====================
export interface Sprint {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: 'planning' | 'active' | 'completed';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

// ==================== КАТЕГОРИИ ====================
export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  projectId: string;
  createdAt: string;
  _count?: { tasks: number };
}

// ==================== ЗАДАЧИ ====================
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  workItemType: 'epic' | 'feature' | 'userStory' | 'bug' | 'task';
  parentId: string | null;
  sprintId: string | null;
  order: number;
  projectId: string;
  categoryId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  category?: TaskCategory | null;
  parent?: Task | null;
  children?: Task[];
  sprint?: Sprint | null;
}

// ==================== АРТЕФАКТЫ ====================
export interface Artifact {
  id: string;
  title: string;
  description: string | null;
  type: 'document' | 'letter' | 'contract' | 'report' | 'other';
  fileName: string | null;
  fileContent: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
}

// ==================== УЧЁТНЫЕ ЗАПИСИ ====================
export interface Credential {
  id: string;
  service: string;
  username: string;
  password: string;
  url: string | null;
  notes: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
}

// ==================== ИНФРАСТРУКТУРА ====================
export interface InfrastructureItem {
  id: string;
  name: string;
  type: 'server' | 'database' | 'service' | 'api' | 'storage' | 'other';
  host: string | null;
  port: string | null;
  credentials: string | null;
  description: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
}

// ==================== APP STATE ====================
export type AppView = 'backlog';

// ==================== UNIFIED DATA RESPONSE ====================
export interface AllDataResponse {
  projects: Project[];
  tasks: Task[];
  sprints: Sprint[];
  categories: TaskCategory[];
  artifacts: Artifact[];
  credentials: Credential[];
  infrastructure: InfrastructureItem[];
}
