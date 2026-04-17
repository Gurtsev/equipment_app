# EquipTrack — Документация

## Содержание

1. [Обзор системы](#1-обзор-системы)
2. [Архитектура](#2-архитектура)
3. [База данных](#3-база-данных)
4. [Backend API](#4-backend-api)
5. [Frontend (React)](#5-frontend-react)
6. [Потоки данных](#6-потоки-данных)
7. [Запуск и сборка](#7-запуск-и-сборка)

---

## 1. Обзор системы

**EquipTrack** — система учёта оборудования. Позволяет:

- Вести реестр оборудования с серийными номерами
- Назначать ответственных сотрудников
- Отслеживать историю перемещений каждой единицы
- Создавать проекты и формировать комплекты оборудования
- Сканировать QR-коды через веб-камеру для быстрого поиска

---

## 2. Архитектура

```
Браузер (React SPA)
       │
       │  HTTP /api/*  (в dev — прокси Vite :5173 → :3000)
       ▼
Express-сервер (Node.js, порт 3000)
       │
       │  pg Pool (TCP)
       ▼
PostgreSQL (equipment_db)
```

### Режим разработки

Запускаются два процесса через `concurrently`:

| Процесс | Порт | Назначение |
|---|---|---|
| `nodemon index.js` | 3000 | Express API + файлы из `public/` |
| `vite` (в `client/`) | 5173 | React с hot reload |

В `client/vite.config.js` настроен прокси — все запросы `/api/*` из браузера перенаправляются на `:3000`. Это позволяет React-приложению на `:5173` обращаться к API без CORS-проблем.

### Продакшн

```bash
npm run build          # собирает client/ → client/dist/
```

Express раздаёт `client/dist/` как статику, а маршрут `/{*splat}` возвращает `index.html` для всех не-API путей — это нужно, чтобы React Router работал при прямом переходе по URL (например, `/assets/42`).

---

## 3. База данных

### Таблица `assets` — оборудование

| Колонка | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | Автоинкремент |
| `title` | VARCHAR | Название оборудования |
| `serial_number` | VARCHAR (UNIQUE) | Серийный номер |
| `status` | VARCHAR | `На складе` / `У сотрудника` / `В ремонте` / `В проекте` |
| `employee_id` | INTEGER FK → employees | Ответственный сотрудник |
| `created_at` | TIMESTAMP | Дата добавления |
| `updated_at` | TIMESTAMP | Дата последнего изменения |

### Таблица `employees` — сотрудники

| Колонка | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | |
| `full_name` | VARCHAR | ФИО |
| `department` | VARCHAR | Отдел |

### Таблица `asset_logs` — история событий

| Колонка | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | |
| `asset_id` | INTEGER FK → assets | Оборудование |
| `event_type` | VARCHAR | `Создание` / `Изменение` / `Назначение` / `Возврат` |
| `description` | TEXT | Описание события |
| `employee_id` | INTEGER FK → employees | Кто выполнил действие |
| `project_id` | INTEGER FK → projects | Связанный проект (если есть) |
| `created_at` | TIMESTAMP | Время события |

Запись в `asset_logs` создаётся **автоматически** при каждом изменении оборудования через API — никакой ручной работы не требуется.

### Таблица `projects` — проекты

| Колонка | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | |
| `name` | VARCHAR | Название проекта |
| `description` | TEXT | Описание |
| `status` | VARCHAR | `Активный` / `Завершен` / `Приостановлен` |
| `started_at` | DATE | Дата начала |
| `ended_at` | DATE | Дата окончания |
| `created_at` | TIMESTAMP | Дата создания |

### Таблица `project_assets` — комплекты оборудования

| Колонка | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | |
| `project_id` | INTEGER FK → projects | Проект |
| `asset_id` | INTEGER FK → assets | Оборудование |
| `assigned_at` | TIMESTAMP | Когда добавлено в проект |
| `released_at` | TIMESTAMP | Когда возвращено (NULL = сейчас в проекте) |
| `note` | TEXT | Примечание |

**Ключевое правило:** одна единица оборудования не может быть одновременно активна в двух проектах. При назначении API проверяет наличие строки с `released_at IS NULL` для данного `asset_id`. История всех назначений сохраняется — строки не удаляются, а заполняется `released_at`.

### Связи

```
employees ──< assets (employee_id)
employees ──< asset_logs (employee_id)
assets    ──< asset_logs (asset_id)
assets    ──< project_assets (asset_id)
projects  ──< project_assets (project_id)
projects  ──< asset_logs (project_id)
```

---

## 4. Backend API

Все маршруты в файле `index.js`. Соединение с БД через пул (`db.js`) — pg Pool автоматически управляет переиспользованием соединений.

Порядок регистрации маршрутов важен: `/api/assets/by-serial/:serial` зарегистрирован **до** `/api/assets/:id`, иначе Express поймал бы `by-serial` как id.

### Оборудование

#### `GET /api/assets`
Возвращает весь список оборудования, отсортированный от новых к старым. Данные обогащены `employee_name` через LEFT JOIN с `employees`.

```json
[
  {
    "id": 1,
    "title": "Ноутбук Dell XPS 15",
    "serial_number": "SN-001",
    "status": "У сотрудника",
    "employee_id": 3,
    "employee_name": "Иванов Иван",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-01T09:00:00Z"
  }
]
```

#### `GET /api/assets/:id`
Карточка одной единицы. Те же поля + `employee_name`.

#### `GET /api/assets/by-serial/:serial`
Поиск по серийному номеру. Используется QR-сканером: после декодирования QR-кода браузер вызывает этот эндпоинт и редиректит на карточку оборудования.

#### `GET /api/assets/:id/logs`
История событий для конкретной единицы, от новых к старым. Включает `employee_name`.

#### `POST /api/assets`
Создаёт новую запись. Автоматически пишет событие `Создание` в `asset_logs`.

Тело запроса:
```json
{
  "title": "Принтер HP LaserJet",
  "serial_number": "SN-042",
  "status": "На складе",
  "employee_id": null
}
```

#### `PATCH /api/assets/:id`
Частичное обновление. Принимает любое подмножество полей. Сравнивает старые и новые значения, формирует осмысленное описание изменений и пишет событие `Изменение` в лог.

Пример: если изменился статус и ответственный, в лог запишется:
`"статус: На складе → У сотрудника; ответственный изменён"`

#### `DELETE /api/assets/:id`
Удаляет оборудование. Связанные логи удаляются каскадно (если настроен CASCADE на FK).

---

### Сотрудники

#### `GET /api/employees`
Список всех сотрудников, отсортированный по ФИО.

#### `POST /api/employees`
```json
{ "full_name": "Петров Пётр", "department": "ИТ-отдел" }
```

---

### Проекты

#### `GET /api/projects?status=Активный`
Список проектов. Параметр `status` опционален. Каждый проект дополнен `asset_count` — количество текущих (не возвращённых) единиц оборудования.

#### `POST /api/projects`
```json
{
  "name": "Выставка 2026",
  "description": "Оснащение стенда",
  "status": "Активный",
  "started_at": "2026-05-01",
  "ended_at": "2026-05-10"
}
```

#### `GET /api/projects/:id`
Карточка проекта + массив `assets` — текущий активный комплект оборудования (`released_at IS NULL`).

```json
{
  "id": 1,
  "name": "Выставка 2026",
  "assets": [
    {
      "id": 5,
      "title": "Монитор LG 27\"",
      "assigned_at": "2026-04-10T08:00:00Z",
      "note": "Для стенда A"
    }
  ]
}
```

#### `PATCH /api/projects/:id`
Частичное обновление проекта.

#### `DELETE /api/projects/:id`
Удаляет проект. Записи `project_assets` удаляются каскадно.

---

### Комплекты оборудования

#### `POST /api/projects/:id/assets`
Назначить оборудование на проект.

```json
{ "asset_id": 5, "note": "Для стенда A" }
```

Что происходит:
1. Проверяет, что оборудование не занято в другом проекте
2. Создаёт строку в `project_assets`
3. Меняет `assets.status` → `В проекте`
4. Пишет событие `Назначение` в `asset_logs`

Если оборудование уже занято — возвращает `409 Conflict`.

#### `DELETE /api/projects/:id/assets/:assetId`
Вернуть оборудование из проекта.

Что происходит:
1. Проставляет `released_at = NOW()` в `project_assets`
2. Меняет `assets.status` → `На складе`
3. Пишет событие `Возврат` в `asset_logs`

---

### QR-коды

#### `GET /api/qrcode?text=SN-042`
Генерирует QR-код из переданного текста (обычно серийного номера) через библиотеку `qrcode`. Возвращает Base64 Data URL.

```json
{ "image": "data:image/png;base64,iVBORw0KGgo..." }
```

---

## 5. Frontend (React)

### Точка входа

`client/src/main.jsx` → `App.jsx` → `QueryClientProvider` + `RouterProvider`

В `App.jsx` зарегистрированы все маршруты и один глобальный `QueryClient` (кеш React Query).

### Маршруты

| URL | Компонент | Описание |
|---|---|---|
| `/` | redirect | Перенаправляет на `/assets` |
| `/assets` | `AssetsPage` | Список оборудования |
| `/assets/:id` | `AssetDetailPage` | Карточка + история |
| `/projects` | `ProjectsPage` | Список проектов |
| `/projects/:id` | `ProjectDetailPage` | Комплект оборудования |
| `/scan` | `ScanPage` | QR-сканер через камеру |

### Управление данными (React Query)

Вместо ручного `fetch` + `useState` используется `@tanstack/react-query`. Это даёт:

- **Кеш**: повторные обращения к одному ресурсу не делают лишних HTTP-запросов
- **Инвалидация**: после мутации (создание/изменение/удаление) вызывается `invalidateQueries` — кеш сбрасывается и данные перезагружаются автоматически
- **Состояния загрузки**: `isLoading`, `isPending`, `isError` из коробки

Все HTTP-вызовы собраны в `client/src/api/client.js`. Каждая функция — обёртка над `fetch` с автоматической обработкой ошибок.

### Компоненты

#### Layout (`components/layout/`)
- `Navbar` — навигационная панель с тремя ссылками. Активная ссылка подсвечивается через `NavLink` из React Router.
- `Layout` — обёртка: `<Navbar>` + `<main>`.

#### Assets (`components/assets/`)
- `StatusBadge` — цветная метка статуса. Маппинг: `На складе` → зелёный, `У сотрудника` → синий, `В ремонте` → жёлтый, `В проекте` → фиолетовый.
- `AssetForm` — форма добавления/редактирования. Если передан prop `initial` — работает в режиме редактирования (`PATCH`), иначе — создание (`POST`). Выпадающий список сотрудников загружается из `/api/employees`.

#### QR (`components/qr/`)
- `QRModal` — модальное окно с QR-кодом. Запрос к `/api/qrcode` кешируется React Query по ключу `['qr', serial_number]` — повторное открытие не делает нового запроса.
- `QRScanner` — сканер через веб-камеру. Алгоритм:
  1. Запрашивает доступ к камере (`facingMode: 'environment'` — задняя камера на телефоне)
  2. В цикле `requestAnimationFrame` рисует кадр в скрытый `<canvas>`
  3. Передаёт пиксели в `jsQR` — если код найден, останавливает цикл
  4. Делает запрос к `/api/assets/by-serial/:decoded`
  5. Переходит на карточку оборудования через `useNavigate`
  6. При размонтировании компонента останавливает камеру и отменяет `requestAnimationFrame`

#### UI (`components/ui/`)
- `Modal` — универсальная модалка через `ReactDOM.createPortal`. Закрывается по клику на оверлей или по `Escape`.
- `ConfirmDialog` — обёртка над `Modal` с кнопками "Отмена" / "Удалить".
- `SearchInput` — поле поиска с debounce 200 мс. Уменьшает количество перерисовок при быстром вводе.

#### History (`components/history/`)
- `AssetLogTable` — таблица с историей событий.

### Страницы

#### `AssetsPage`
- Загружает `GET /api/assets` через React Query
- Фильтрует список **на клиенте** по полям `title`, `serial_number`, `employee_name` — без дополнительных запросов к серверу
- Открывает `AssetForm` в `Modal` для добавления
- Кнопка QR → `QRModal`
- Кнопка Удалить → `ConfirmDialog` → `DELETE /api/assets/:id`

#### `AssetDetailPage`
- Два параллельных запроса: `GET /api/assets/:id` и `GET /api/assets/:id/logs`
- Кнопка "Редактировать" открывает `AssetForm` с заполненными данными
- После сохранения инвалидируются ключи `['assets']` и `['asset', id]`

#### `ProjectsPage`
- Карточки проектов с количеством оборудования
- Форма создания встроена в саму страницу (компонент `ProjectForm`) — не выносим в отдельный файл, т.к. используется только здесь

#### `ProjectDetailPage`
- Загружает `GET /api/projects/:id` — возвращает проект сразу с массивом текущего оборудования
- Модалка `AssignModal` — выпадающий список свободного оборудования (статус ≠ `В проекте`)
- Кнопка "Освободить" → `DELETE /api/projects/:id/assets/:assetId` → статус оборудования возвращается в `На складе`

---

## 6. Потоки данных

### Добавление оборудования

```
Пользователь заполняет AssetForm
  └─► POST /api/assets
        └─► INSERT INTO assets
        └─► INSERT INTO asset_logs (event_type='Создание')
        └─► 201 Created
  └─► invalidateQueries(['assets'])
  └─► Таблица обновляется автоматически
```

### Назначение на проект

```
Пользователь выбирает оборудование в AssignModal
  └─► POST /api/projects/:id/assets
        └─► SELECT проверка занятости
        ├─► 409 если занято → показываем ошибку
        └─► INSERT INTO project_assets
        └─► UPDATE assets SET status='В проекте'
        └─► INSERT INTO asset_logs (event_type='Назначение')
  └─► invalidateQueries(['project', id])
  └─► invalidateQueries(['assets'])
```

### Сканирование QR

```
QRScanner читает кадры с камеры
  └─► jsQR декодирует QR → serial_number
  └─► GET /api/assets/by-serial/:serial
        ├─► 404 → показываем ошибку, продолжаем сканирование
        └─► 200 → navigate('/assets/:id')
```

---

## 7. Запуск и сборка

### Предварительные требования

- Node.js 18+
- PostgreSQL с базой `equipment_db`
- Файл `.env` в корне проекта:

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=equipment_db
```

### Первоначальная настройка

```bash
# 1. Зависимости бэкенда
npm install

# 2. Зависимости фронтенда
cd client && npm install && cd ..

# 3. Применить миграции БД
psql -U postgres -d equipment_db -f migrations.sql
```

### Разработка

```bash
npm run dev
```

Открыть: [http://localhost:5173](http://localhost:5173)

### Продакшн

```bash
npm run build          # Собирает React → client/dist/
npm start              # Запускает Express, раздаёт dist/
```

Открыть: [http://localhost:3000](http://localhost:3000)

### Структура файлов

```
equipment-app/
├── index.js              # Express-сервер, все API-маршруты
├── db.js                 # PostgreSQL connection pool
├── package.json          # Зависимости бэкенда + скрипты
├── .env                  # Конфигурация БД (не коммитить!)
├── migrations.sql        # SQL-миграции (запустить один раз)
├── public/               # Старый vanilla-фронтенд (не используется)
└── client/               # React-приложение (Vite)
    ├── vite.config.js    # Прокси /api → :3000
    ├── src/
    │   ├── App.jsx       # Роутер + QueryClient
    │   ├── main.jsx      # ReactDOM.createRoot
    │   ├── index.css     # Все стили
    │   ├── api/
    │   │   └── client.js # HTTP-функции (единственное место fetch)
    │   ├── pages/        # Страницы по маршрутам
    │   └── components/   # Переиспользуемые компоненты
    └── dist/             # Собранный фронтенд (генерируется при build)
```
