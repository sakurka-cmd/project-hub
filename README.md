# ProjectHub

Единая платформа для управления проектами, задачами, артефактами и инфраструктурой. Древовидная структура с динамическими полями, файловыми вложениями, протоколами решений и ролевой моделью доступа.

## Возможности

- **Компактное дерево** — единая древовидная структура проектов и узлов (ветки, элементы, задачи, протоколы) без лишних блоков, с неограниченной вложенностью
- **Inline-переименование** — двойной клик на названии проекта для быстрого редактирования
- **Цветовые метки** — 8 предустановленных цветов для визуальной категоризации проектов
- **Статусы проектов** — active / paused / completed / archived с сортировкой по приоритету
- **Протоколы** — создание с автоподстановкой даты, текстовое описание, таблица решений; экспорт в формате для Outlook
- **Динамические поля** — произвольные ключ-значение пары для каждого элемента
- **Типы веток** — визуальная категоризация: задачи, инфраструктура, учётные данные, артефакты
- **Типы задач** — предопределённые типы с цветовой маркировкой
- **Чекбоксы задач** — работающие на любом уровне вложенности (в корне и внутри веток)
- **Файловые вложения** — загрузка через диалог или drag-and-drop, скачивание и удаление
- **Дублирование** — глубокое рекурсивное копирование узлов
- **Перетаскивание** — drag-and-drop перемещение между ветками
- **Экспорт** — ветки в HTML-таблицу; протоколов в формат для Outlook
- **Плавающие кнопки действий** — «Сохранить» (появляется при изменениях) и «Экспорт» вверху панели
- **Пользователи и роли** — `admin` / `user`, изоляция проектов, первый пользователь = admin
- **Системные настройки** — лимит файлов, toggle регистрации

## Быстрый старт

### Host-build + systemd (рекомендуется)

```bash
git clone https://github.com/sakurka-cmd/project-hub.git
cd project-hub

# Установите зависимости (требуется Node.js 22+ и bun)
source ~/.nvm/nvm.sh && nvm use 22
export PATH=$HOME/.bun/bin:$PATH

bun install
bun run build

# Копирование артефактов standalone-сборки
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
cp -r prisma .next/standalone/
cp -r node_modules/.prisma .next/standalone/node_modules/
cp -r node_modules/prisma .next/standalone/node_modules/
cp -r node_modules/@prisma .next/standalone/node_modules/
```

Создайте systemd-сервис (пример):

```ini
[Unit]
Description=ProjectHub
After=network.target

[Service]
Type=simple
User=userv
WorkingDirectory=/home/userv/project-hub/.next/standalone
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:/home/userv/project-hub/data/projecthub.db
Environment=NEXTAUTH_SECRET=your-secret-here
Environment=NEXTAUTH_URL=http://your-host:82
Environment=UPLOAD_DIR=/home/userv/project-hub/data/uploads
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
# Инициализация БД (при первом запуске)
DATABASE_URL=file:/home/userv/project-hub/data/projecthub.db npx prisma db push

# Запуск
sudo systemctl enable project-hub
sudo systemctl start project-hub
```

### Docker

```bash
git clone https://github.com/sakurka-cmd/project-hub.git
cd project-hub

# Сборка на хосте
./deploy.sh

# Запуск
docker compose up -d
```

## Настройка окружения

| Переменная | Описание | По умолчанию |
|---|---|---|
| `DATABASE_URL` | Путь к SQLite-базе | `file:./data/projecthub.db` |
| `NEXTAUTH_SECRET` | Секрет для JWT-сессий | **Обязательный** |
| `NEXTAUTH_URL` | Базовый URL приложения | — |
| `UPLOAD_DIR` | Директория для загруженных файлов | `{cwd}/uploads` |
| `PORT` | Порт сервера | `3000` |
| `HOSTNAME` | Хост для привязки | `0.0.0.0` |
| `NODE_ENV` | Окружение | `production` |

Пример `.env`:

```env
DATABASE_URL=file:/home/user/project-hub/data/projecthub.db
NEXTAUTH_SECRET=your-random-secret-min-32-chars
NEXTAUTH_URL=http://your-host:82
UPLOAD_DIR=/home/user/project-hub/data/uploads
```

## Начало работы

1. Откройте приложение в браузере
2. Первый зарегистрированный пользователь автоматически получит роль `admin`
3. Создайте проект и добавьте ветки, элементы, задачи или протоколы
4. Настраивайте поля, прикрепляйте файлы, экспортируйте данные

## Архитектура

Подробное описание проектных решений — в [ARCHITECTURE.md](./ARCHITECTURE.md).

### Технологический стек

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS 4, shadcn/ui (45+ компонентов), lucide-react
- **State**: Zustand (единственный store)
- **DnD**: @dnd-kit/core v6
- **Auth**: NextAuth v4 (Credentials Provider, JWT-сессии)
- **Backend**: Next.js API Routes (Route Handlers)
- **ORM**: Prisma 6.x
- **БД**: SQLite (WAL)
- **Деплой**: Host-build + standalone output, systemd + Caddy reverse proxy

### Структура БД

```
User            ← аккаунты (admin / user)
├── Project[]   ← проекты (изолированы по userId)
│   ├── Node[]  ← дерево узлов (самоссылка parentId)
│   │   ├── FileAttachment[]  ← файлы на диске
│   │   └── Node[] (children) ← рекурсивные дочерние узлы
│   └── ...

ElementType     ← предопределённые типы элементов с фиксированными полями
TaskType        ← типы задач
SystemSetting   ← глобальные настройки (key → value)
```

### API

| Метод | Маршрут | Описание |
|---|---|---|
| `POST` | `/api/auth/...` | Авторизация (NextAuth) |
| `POST` | `/api/register` | Регистрация пользователя |
| `POST` | `/api/seed` | Создание admin-аккаунта |
| `GET` | `/api/me` | Текущий пользователь |
| `GET` | `/api/all-data` | Все данные одним запросом |
| `GET/POST` | `/api/projects` | Список / создание проекта |
| `GET/PUT/DELETE` | `/api/projects/[id]` | CRUD проекта |
| `GET/POST` | `/api/nodes` | Список / создание узла |
| `GET/PUT/DELETE` | `/api/nodes/[id]` | CRUD узла |
| `POST` | `/api/nodes/[id]/duplicate` | Дублирование узла |
| `GET` | `/api/nodes/[id]/export` | Экспорт ветки в таблицу |
| `POST` | `/api/upload` | Загрузка файла (FormData) |
| `GET` | `/api/files/[id]` | Скачивание файла |
| `DELETE` | `/api/files/[id]` | Удаление файла |
| `GET/PUT` | `/api/settings` | Настройки системы |
| `GET/POST` | `/api/element-types` | Типы элементов |
| `GET/POST` | `/api/task-types` | Типы задач |

## Лицензия

MIT
