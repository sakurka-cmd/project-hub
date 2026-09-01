'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  Bot,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  description: string;
  body?: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/agent/projects',
    description: 'Список проектов: id, название, портфель, счётчики задач',
  },
  {
    method: 'GET',
    path: '/api/agent/projects/{id}',
    description: 'Проект + полное дерево узлов (ветки, задачи, элементы, протоколы)',
  },
  {
    method: 'GET',
    path: '/api/agent/tasks',
    description:
      'Плоский список задач с описаниями. Фильтры: ?project=<id> · ?status=open|done|all (по умолчанию open) · ?q=<текст>',
  },
  {
    method: 'GET',
    path: '/api/agent/tasks/{id}',
    description: 'Задача: описание, поля, путь, вложения',
  },
  {
    method: 'PATCH',
    path: '/api/agent/tasks/{id}',
    description: 'Обновить задачу: описание, название, статус, доп. поля',
    body: '{"name": "...", "description": "...", "completed": false, "fields": {"ключ": "значение"}}',
  },
  {
    method: 'POST',
    path: '/api/agent/tasks/{id}/close',
    description: 'Закрыть задачу (completed = true)',
  },
  {
    method: 'POST',
    path: '/api/agent/tasks/{id}/reopen',
    description: 'Переоткрыть задачу (completed = false)',
  },
  {
    method: 'POST',
    path: '/api/agent/projects/{id}/tasks',
    description: 'Создать задачу в проекте',
    body: '{"name": "...", "description": "...", "parentId": "<id ветки, необязательно>"}',
  },
  {
    method: 'POST',
    path: '/api/agent/projects/{id}/nodes',
    description:
      'Создать узел любого типа — документация, инфраструктура и прочее. nodeType: branch | item | task | protocol; branchType (для веток): tasks | infrastructure | credentials | artifacts',
    body: '{"name": "Документация/API", "nodeType": "item", "description": "markdown-текст"}',
  },
  {
    method: 'GET',
    path: '/api/agent/nodes/{id}',
    description: 'Узел + дочерние узлы + вложения',
  },
  {
    method: 'PATCH',
    path: '/api/agent/nodes/{id}',
    description: 'Обновить узел: name, completed, parentId, fields',
    body: '{"fields": {"ключ": "значение"}}',
  },
  {
    method: 'POST',
    path: '/api/agent/nodes/{id}/files',
    description: 'Прикрепить файл к узлу (multipart/form-data, поле file)',
  },
  {
    method: 'GET',
    path: '/api/agent/files/{id}',
    description: 'Скачать вложение',
  },
];

export function AgentApiManager() {
  const { toast } = useToast();
  const projects = useAppStore((s) => s.projects);

  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<{ configured: boolean; token: string | null } | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const token = tokenInfo?.token || '';

  useEffect(() => {
    api
      .getAgentToken()
      .then(setTokenInfo)
      .catch(() => setTokenInfo({ configured: false, token: null }))
      .finally(() => setLoading(false));
  }, []);

  const agentBrief = useMemo(() => {
    const lines: string[] = [
      '# ProjectHub — работа с бэклогом через API',
      '',
      'Ты подключаешься к системе управления проектами ProjectHub по HTTP API.',
      '',
      '## Подключение',
      `Base URL: ${baseUrl}`,
      `Токен: ${token || '(не настроен — запроси у администратора)'}`,
      '',
      'Все запросы требуют заголовок: `Authorization: Bearer <токен>`.',
      '',
      'Проверка связи:',
      '```bash',
      `curl -s -H "Authorization: Bearer ${token || '<TOKEN>'}" ${baseUrl}/api/agent/projects`,
      '```',
      '',
      '## Эндпоинты',
      '### Проекты',
      '- `GET /api/agent/projects` — список проектов (id, name, portfolio, openTasks)',
      '- `GET /api/agent/projects/{id}` — проект + полное дерево узлов',
      '- `POST /api/agent/projects/{id}/tasks` — создать задачу `{name, description?, parentId?}`',
      '- `POST /api/agent/projects/{id}/nodes` — создать узел `{name, nodeType: branch|item|task|protocol, parentId?, branchType?, description?, fields?}`',
      '',
      '### Задачи',
      '- `GET /api/agent/tasks?status=open|done|all&q=<текст>&project=<id>` — плоский список задач с описаниями и путями',
      '- `GET /api/agent/tasks/{id}` — задача целиком (описание, поля, вложения)',
      '- `PATCH /api/agent/tasks/{id}` — обновить `{name?, description?, completed?, fields?}`',
      '- `POST /api/agent/tasks/{id}/close` — закрыть',
      '- `POST /api/agent/tasks/{id}/reopen` — переоткрыть',
      '',
      '### Узлы и файлы',
      '- `GET /api/agent/nodes/{id}` — узел + дети + вложения',
      '- `PATCH /api/agent/nodes/{id}` — обновить `{name?, completed?, parentId?, fields?}`',
      '- `POST /api/agent/nodes/{id}/files` — прикрепить файл (multipart, поле `file`)',
      '- `GET /api/agent/files/{id}` — скачать вложение',
      '',
      '## Типовой сценарий работы с бэклогом',
      '1. `GET /api/agent/projects` — прочитать перечень проектов, выбрать нужный по name.',
      '2. `GET /api/agent/tasks?project=<id>&status=open` — прочитать открытые задачи проекта.',
      '3. Заполнить описание задачи: `PATCH /api/agent/tasks/{id}` с телом `{"description": "..."}`.',
      '4. Выполнить работу, зафиксировать результат в описании или в полях (`fields`).',
      '5. Закрыть задачу: `POST /api/agent/tasks/{id}/close`.',
      '6. Добавить документацию / информацию по инфраструктуре: `POST /api/agent/projects/{id}/nodes` (например `{"name": "Инфраструктура", "nodeType": "branch", "branchType": "infrastructure"}`), текст — в `description` или `fields`; файлы — через `POST /api/agent/nodes/{id}/files`.',
      '',
      '## Пример: заполнить описание и закрыть задачу',
      '```bash',
      `curl -s -X PATCH -H "Authorization: Bearer ${token || '<TOKEN>'}" -H "Content-Type: application/json" \\`,
      `  -d '{"description": "Сделано: ..."}' ${baseUrl}/api/agent/tasks/<TASK_ID>`,
      '',
      `curl -s -X POST -H "Authorization: Bearer ${token || '<TOKEN>'}" ${baseUrl}/api/agent/tasks/<TASK_ID>/close`,
      '```',
      '',
    ];
    return lines.join('\n');
  }, [baseUrl, token]);

  const handleCopy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} скопирован` });
    } catch {
      toast({ title: 'Не удалось скопировать', variant: 'destructive' });
    }
  };

  const handleCopyBrief = async () => {
    await handleCopy(agentBrief, 'Инструкция');
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  const handleRegenerate = async () => {
    try {
      const info = await api.regenerateAgentToken();
      setTokenInfo(info);
      setShowToken(true);
      toast({ title: 'Токен сгенерирован', description: 'Старый токен больше не работает' });
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err?.message || 'Не удалось сгенерировать токен', variant: 'destructive' });
    }
    setRegenOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Token */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Токен доступа агентов</span>
          {tokenInfo?.configured ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              настроен
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              не настроен
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Агенты обращаются к API с этим токеном. Храните его как пароль — он даёт полный доступ
          к проектам и задачам.
        </p>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={showToken && token ? token : token ? '••••••••••••••••••••••••' : '— не задан —'}
            className="font-mono text-xs"
          />
          {token && (
            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowToken(!showToken)}>
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          {token && (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => handleCopy(token, 'Токен')}
              disabled={!showToken}
              title={showToken ? 'Скопировать токен' : 'Сначала покажите токен'}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setRegenOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" />
            {tokenInfo?.configured ? 'Сменить' : 'Сгенерировать'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Base URL для агентов: <span className="font-mono">{baseUrl}</span>
          {' '}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-primary hover:underline"
            onClick={() => handleCopy(baseUrl, 'Base URL')}
          >
            <Copy className="h-3 w-3" />
            копировать
          </button>
        </p>
      </div>

      {/* Agent brief */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Инструкция для агента</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Готовый текст с подключением и сценариями работы с бэклогом. Скопируйте и передайте
          агенту (в системный промпт или первый запрос) — этого достаточно для работы.
        </p>
        <Button onClick={handleCopyBrief} className="gap-2" disabled={!token}>
          {copiedBrief ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiedBrief ? 'Скопировано' : 'Скопировать инструкцию для агента'}
        </Button>
        {!token && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Сначала сгенерируйте токен — он входит в текст инструкции.
          </p>
        )}
      </div>

      {/* Endpoints */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Эндпоинты</span>
        <div className="rounded-md border divide-y">
          {ENDPOINTS.map((ep) => (
            <div key={`${ep.method}-${ep.path}`} className="flex flex-col gap-1 px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    ep.method === 'GET'
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'
                      : ep.method === 'POST'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  }`}
                >
                  {ep.method}
                </span>
                <code className="text-xs font-mono break-all">{ep.path}</code>
              </div>
              <p className="text-xs text-muted-foreground">{ep.description}</p>
              {ep.body && (
                <pre className="text-[11px] font-mono bg-muted/50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap">
                  {ep.body}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current projects */}
      {projects.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Текущие проекты</span>
          <p className="text-xs text-muted-foreground">
            Идентификаторы для обращения через API (можно получить и через
            <code className="mx-1 font-mono">GET /api/agent/projects</code>).
          </p>
          <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-sm truncate flex-1 min-w-0">{p.name}</span>
                <code className="text-[10px] font-mono text-muted-foreground shrink-0">{p.id}</code>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => handleCopy(p.id, 'ID проекта')}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regenerate confirm */}
      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сгенерировать новый токен?</AlertDialogTitle>
            <AlertDialogDescription>
              Текущий токен перестанет работать. Все агенты, использующие его, потеряют доступ,
              пока вы не передадите им новый токен.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>Сгенерировать</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
