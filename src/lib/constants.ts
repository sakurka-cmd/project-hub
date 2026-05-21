'use client';

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Готово',
  cancelled: 'Отменено',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

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

export const WORK_ITEM_TYPE_LABELS: Record<string, string> = {
  epic: 'Epic',
  feature: 'Feature',
  userStory: 'История',
  bug: 'Баг',
  task: 'Задача',
};

export const WORK_ITEM_TYPE_COLORS: Record<string, string> = {
  epic: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  feature: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  userStory: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  bug: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  task: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const WORK_ITEM_TYPE_BORDER_COLORS: Record<string, string> = {
  epic: 'border-l-violet-500',
  feature: 'border-l-blue-500',
  userStory: 'border-l-teal-500',
  bug: 'border-l-red-500',
  task: 'border-l-gray-400',
};

export const WORK_ITEM_TYPES = ['epic', 'feature', 'userStory', 'bug', 'task'] as const;

export const WORK_ITEM_TYPE_PREFIX: Record<string, string> = {
  epic: 'EP',
  feature: 'FE',
  userStory: 'US',
  bug: 'BG',
  task: 'TK',
};

export const CHILD_TYPE_FOR_PARENT: Record<string, 'feature' | 'userStory' | 'bug' | 'task'> = {
  epic: 'feature',
  feature: 'userStory',
  userStory: 'task',
  bug: 'task',
  task: 'task',
};

export const SPRINT_STATUS_LABELS: Record<string, string> = {
  planning: 'Планирование',
  active: 'Активный',
  completed: 'Завершён',
};

export const SPRINT_STATUS_COLORS: Record<string, string> = {
  planning: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const SPRINT_STATUSES = ['planning', 'active', 'completed'] as const;

export const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  document: 'Документ',
  letter: 'Письмо',
  contract: 'Контракт',
  report: 'Отчёт',
  other: 'Другое',
};

export const INFRA_TYPE_LABELS: Record<string, string> = {
  server: 'Сервер',
  database: 'База данных',
  service: 'Сервис',
  api: 'API',
  storage: 'Хранилище',
  other: 'Другое',
};

export const INFRA_TYPE_COLORS: Record<string, string> = {
  server: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  database: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  service: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  api: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  storage: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;
export const ARTIFACT_TYPES = ['document', 'letter', 'contract', 'report', 'other'] as const;
export const INFRA_TYPES = ['server', 'database', 'service', 'api', 'storage', 'other'] as const;

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function truncate(str: string | null, maxLen: number): string {
  if (!str) return '—';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

export function getShortId(id: string): string {
  return id.slice(-6).toUpperCase();
}
