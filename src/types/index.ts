// ==================== ПРОЕКТЫ ====================
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  color: string;
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
  nodeType: 'branch' | 'item';
  branchType: string | null;
  fields: Record<string, unknown>;
  order: number;
  createdAt: string;
  updatedAt: string;
  children?: ProjectNode[];
}

// ==================== APP STATE ====================
export type AppView = 'projects';

// ==================== UNIFIED DATA RESPONSE ====================
export interface AllDataResponse {
  projects: Project[];
  nodes: ProjectNode[];
}
