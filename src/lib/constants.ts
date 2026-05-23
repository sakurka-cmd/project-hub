export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Активный',
  paused: 'Приостановлен',
  completed: 'Завершён',
  archived: 'Архив',
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const BRANCH_TYPE_LABELS: Record<string, string> = {
  tasks: 'Задачи',
  infrastructure: 'Инфраструктура',
  credentials: 'Учётные записи',
  artifacts: 'Артефакты',
};

export const BRANCH_TYPE_ICONS: Record<string, string> = {
  tasks: 'check-square',
  infrastructure: 'server',
  credentials: 'key-round',
  artifacts: 'file-text',
};

export const BRANCH_TYPE_COLORS: Record<string, string> = {
  tasks: 'text-indigo-600 dark:text-indigo-400',
  infrastructure: 'text-emerald-600 dark:text-emerald-400',
  credentials: 'text-amber-600 dark:text-amber-400',
  artifacts: 'text-rose-600 dark:text-rose-400',
};

export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

export const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;

export function getShortId(id: string): string {
  return id.slice(-6).toUpperCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
