# ProjectHub

Единая платформа для управления проектами, задачами, артефактами и инфраструктурой. Древовидная структура с динамическими полями, файловыми вложениями и ролевой моделью доступа.

## Возможности

- **Дерево проектов** — иерархическая структура узлов (ветки и элементы) с неограниченной вложенностью
- **Динамические поля** — произвольные ключ-значение пары для каждого элемента, без жёсткой схемы
- **Типы веток** — визуальная категоризация: задачи, инфраструктура, учётные данные, артефакты
- **Файловые вложения** — загрузка через диалог выбора файлов или drag-and-drop, с ограничением размера
- **Дублирование** — глубокое рекурсивное копирование узлов со всеми дочерними элементами
- **Перетаскивание** — drag-and-drop перемещение элементов между ветками
- **Экспорт** — выгрузка ветки в HTML-таблицу в новом окне
- **Пользователи** — регистрация, авторизация, изоляция проектов по аккаунтам
- **Роли** — `admin` (видит все проекты, управляет настройками) и `user` (только свои проекты)
- **Системные настройки** — ограничение размера файлов, включение/выключение регистрации

## Быстрый старт (Docker)

```bash
git clone https://github.com/sakurka-cmd/project-hub.git
cd project-hub

# Сборка на хосте (требует Node.js 22+ и bun)
./deploy.sh

# Запуск
docker compose up -d
```

### Без Docker (host-build + systemd)

```bash
git clone https://github.com/sakurka-cmd/project-hub.git
cd project-hub

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

# Инициализация БД
DATABASE_URL=file:/path/to/data/projecthub.db npx prisma db push

# Запуск
NODE_ENV=production DATABASE_URL=file:/path/to/data/projecthub.db \
NEXTAUTH_SECRET=your-secret-here NEXTAUTH_URL=http://your-host \
UPLOAD_DIR=/path/to/data/uploads \
node .next/standalone/server.js
```

## Настройка окружения

| Переменная | Описание | По умолчанию |
|---|---|---|
| `DATABASE_URL` | Путь к SQLite-базе | `file:./data/projecthub.db` |
| `NEXTAUTH_SECRET` | Секрет для JWT-сессий | **Обязательный** |
| `NEXTAUTH_URL` | Базовый URL приложения | — |
| `UPLOAD_DIR` | Директория для загруженных файлов | `{cwd}/data/uploads` |
| `PORT` | Порт сервера | `3000` |
| `HOSTNAME` | Хост для привязки | `0.0.0.0` |
| `NODE_ENV` | Окружение | `production` |

## Начало работы

1. Откройте приложение в браузере
2. Первый зарегистрированный пользователь автоматически получит роль `admin`
3. Создайте проект и добавьте ветки и элементы
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

SystemSetting   ← глобальные настройки (key → value)
```

### API

| Метод | Маршрут | Описание |
|---|---|---|
| `POST` | `/api/auth/...` | Авторизация (NextAuth) |
| `POST` | `/api/register` | Регистрация пользователя |
| `POST` | `/api/seed` | Создание admin-аккаунта |
| `GET` | `/api/all-data` | Все данные одним запросом |
| `GET/POST` | `/api/projects` | Список / создание проекта |
| `GET/PUT/DELETE` | `/api/projects/[id]` | CRUD проекта |
| `GET/POST` | `/api/nodes` | Список / создание узла |
| `GET/PUT/DELETE` | `/api/nodes/[id]` | CRUD узла |
| `POST` | `/api/nodes/[id]/duplicate` | Дублирование узла |
| `GET` | `/api/nodes/[id]/export` | Экспорт ветки в таблицу |
| `POST` | `/api/upload` | Загрузка файла |
| `GET/DELETE` | `/api/files/[id]` | Скачивание / удаление файла |
| `GET/PUT` | `/api/settings` | Настройки системы |

## Скриншоты

> *TODO: добавить скриншоты интерфейса*

## Лицензия

MIT
