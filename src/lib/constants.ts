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
