// ==================== ПОЛЬЗОВАТЕЛИ ====================
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

// ==================== ПРОЕКТЫ ====================
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  color: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { nodes: number };
  nodeCount?: number;
}

// ==================== УЗЛЫ ДЕРЕВА ====================
export interface ProjectNode {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  nodeType: 'branch' | 'item' | 'task' | 'protocol';
  branchType: string | null;
  elementTypeId: string | null;
  taskTypeId: string | null;
  completed: boolean;
  fields: Record<string, unknown>;
  order: number;
  createdAt: string;
  updatedAt: string;
  children?: ProjectNode[];
}

// ==================== ФАЙЛЫ ====================
export interface FileAttachment {
  id: string;
  nodeId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// ==================== СИСТЕМНЫЕ НАСТРОЙКИ ====================
export interface SystemSetting {
  key: string;
  value: string;
}

// ==================== ТИПЫ ЭЛЕМЕНТОВ ====================
export interface ElementTypeField {
  key: string;
  defaultValue: string;
}

export interface ElementType {
  id: string;
  name: string;
  description: string | null;
  color: string;
  fields: ElementTypeField[];
  createdAt: string;
  updatedAt: string;
}

// ==================== ТИПЫ ЗАДАЧ ====================
export interface TaskType {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== UNIFIED DATA RESPONSE ====================
export interface AllDataResponse {
  projects: Project[];
  nodes: ProjectNode[];
  elementTypes: ElementType[];
  taskTypes: TaskType[];
}

// ==================== SESSION EXTENSIONS ====================
export interface SessionUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}
