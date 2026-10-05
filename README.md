# Maintenance API

REST API на Express для учёта заявок на техническое обслуживание оборудования
производственной площадки (например, ветропарка). Сервис ведёт справочник
оборудования и заявок на его обслуживание, контролирует жизненный цикл заявки
и позволяет оценить погодные условия на объекте перед планированием наружных работ.

## Содержание

- [Требования к окружению](#требования-к-окружению)
- [Установка](#установка)
- [Переменные окружения](#переменные-окружения)
- [Запуск](#запуск)
- [Модель данных](#модель-данных)
- [Жизненный цикл заявки](#жизненный-цикл-заявки)
- [Эндпоинты API](#эндпоинты-api)
- [Формат ошибок](#формат-ошибок)
- [Примеры запросов и ответов](#примеры-запросов-и-ответов)
- [Безопасность](#безопасность)
- [Структура проекта](#структура-проекта)
- [Скрипты](#скрипты)
- [Тестирование в Postman](#тестирование-в-postman)
- [Docker](#docker)

---

## Требования к окружению

- **Node.js** версии 20 или выше
- **npm**
- Свободный порт (по умолчанию — 3000)
- Доступ в интернет (для эндпоинта прогноза погоды)

## Установка

```bash
git clone https://github.com/ulianderson33/maintenance-api.git
cd maintenance-api
npm install
cp .env.example .env
```

Отредактируй `.env`, если нужно изменить настройки по умолчанию (см. раздел
[Переменные окружения](#переменные-окружения)).

## Переменные окружения

Все параметры задаются через переменные окружения. Шаблон — `.env.example`.

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3000` | Порт HTTP-сервера |
| `NODE_ENV` | `development` | Режим работы (`development` / `production` / `test`) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Список разрешённых источников через запятую |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Окно ограничения частоты запросов, мс |
| `RATE_LIMIT_MAX` | `100` | Максимум запросов в окне с одного IP |
| `WEATHER_API_URL` | `https://api.open-meteo.com/v1/forecast` | URL внешнего API прогноза |
| `GEOCODING_API_URL` | `https://geocoding-api.open-meteo.com/v1/search` | URL геокодинга |
| `REQUEST_TIMEOUT_MS` | `5000` | Таймаут запроса к внешнему API, мс |
| `WEATHER_MAX_WIND_MS` | `10` | Порог скорости ветра для пригодности окна (м/с) |
| `WEATHER_MAX_PRECIPITATION_MM` | `0.5` | Порог осадков для пригодности окна (мм) |
| `DATA_DIR` | `data` | Каталог для JSON-файлов хранилища |
| `LOG_LEVEL` | `info` | Уровень логирования (`debug` / `info` / `warn` / `error`) |

## Запуск

**Разработка (с автоперезапуском при изменениях):**

```bash
npm run dev
```

**Продакшен:**

```bash
npm start
```

**Проверка доступности:**

```bash
curl http://localhost:3000/api/health
# {"data":{"status":"ok"}}
```

---

## Модель данных

### Оборудование (equipment)

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | string (UUID) | Генерируется сервером |
| `name` | string | 3–100 символов, обязательное |
| `type` | string | `turbine` \| `inverter` \| `sensor` \| `substation` |
| `serialNumber` | string | Уникальный в пределах системы |
| `location.lat` | number | -90…90 |
| `location.lon` | number | -180…180 |
| `status` | string | `operational` \| `maintenance` \| `fault` \| `decommissioned` |
| `installedAt` | ISO-дата | Не в будущем |
| `createdAt` | ISO-дата-время | Проставляется сервером |
| `updatedAt` | ISO-дата-время | Проставляется сервером |

### Заявка на обслуживание (maintenance request)

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | string (UUID) | Генерируется сервером |
| `equipmentId` | string (UUID) | Ссылка на существующее оборудование |
| `title` | string | 5–120 символов, обязательное |
| `description` | string | До 2000 символов |
| `priority` | string | `low` \| `medium` \| `high` \| `critical` |
| `status` | string | `new` \| `in_progress` \| `done` \| `rejected` (по умолчанию `new`) |
| `plannedAt` | ISO-дата-время | Необязательное |
| `createdAt` | ISO-дата-время | Проставляется сервером |
| `updatedAt` | ISO-дата-время | Проставляется сервером |

Поля `id`, `createdAt`, `updatedAt` **не могут быть изменены через API**.
Неизвестные поля в теле запроса **игнорируются** (валидатор отбрасывает их
до попадания в сервис).

---

## Жизненный цикл заявки

Допустимые переходы статуса заявки:

```
new ──────► in_progress ──────► done
 │              │
 │              ▼
 └──────────► rejected
```

| Из | В |
|---|---|
| `new` | `in_progress`, `rejected` |
| `in_progress` | `done`, `rejected` |
| `done` | — (терминальное) |
| `rejected` | — (терминальное) |

Недопустимый переход возвращает **409 Conflict** с кодом `INVALID_STATUS_TRANSITION`.
Смена статуса выполняется отдельным эндпоинтом `PATCH /api/requests/:id/status`.

---

## Эндпоинты API

Все запросы к API начинаются с `/api`.

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/api/health` | Проверка доступности сервиса |
| `GET` | `/api/equipment` | Список оборудования (фильтры, сортировка, пагинация) |
| `POST` | `/api/equipment` | Создание единицы оборудования |
| `GET` | `/api/equipment/:id` | Карточка оборудования |
| `PATCH` | `/api/equipment/:id` | Частичное обновление |
| `DELETE` | `/api/equipment/:id` | Удаление (409 при наличии открытых заявок) |
| `GET` | `/api/equipment/:id/requests` | Заявки по оборудованию |
| `GET` | `/api/equipment/:id/weather` | Прогноз погоды и пригодность окна |
| `GET` | `/api/requests` | Список заявок (фильтры, сортировка, пагинация) |
| `POST` | `/api/requests` | Создание заявки |
| `GET` | `/api/requests/:id` | Карточка заявки |
| `PATCH` | `/api/requests/:id` | Редактирование полей заявки |
| `PATCH` | `/api/requests/:id/status` | Смена статуса с проверкой перехода |
| `DELETE` | `/api/requests/:id` | Удаление заявки |

### Параметры пагинации и сортировки

Для `GET /api/equipment` и `GET /api/requests`:

| Параметр | Значения | По умолчанию |
|---|---|---|
| `page` | целое ≥ 1 | `1` |
| `limit` | целое 1–100 | `20` |
| `sort` | `createdAt` \| `updatedAt` \| ... | `createdAt` |
| `order` | `asc` \| `desc` | `desc` |

Ответ списочных эндпоинтов:

```json
{
  "data": [ /* массив объектов */ ],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

### Правило пригодности окна для наружных работ

Эндпоинт `GET /api/equipment/:id/weather` возвращает прогноз и флаг `suitable`
для каждого дня. День считается пригодным, если одновременно:

- Осадки ≤ `WEATHER_MAX_PRECIPITATION_MM` (по умолчанию 0.5 мм)
- Скорость ветра ≤ `WEATHER_MAX_WIND_MS` (по умолчанию 10 м/с)

Пороги задаются через переменные окружения.

---

## Формат ошибок

Все ошибки возвращаются в едином формате:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные запроса",
    "details": [
      { "field": "priority", "message": "Недопустимое значение" }
    ],
    "requestId": "b1f2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
  }
}
```

| Поле | Описание |
|---|---|
| `code` | Машиночитаемый код ошибки |
| `message` | Человекочитаемое сообщение |
| `details` | Массив некорректных полей (только для `VALIDATION_ERROR`) |
| `requestId` | Идентификатор запроса для поиска в логах |

Коды ошибок:

| HTTP | `code` | Когда возникает |
|---|---|---|
| 400 | `BAD_REQUEST` | Некорректный запрос |
| 404 | `NOT_FOUND` | Ресурс не найден |
| 409 | `SERIAL_NUMBER_CONFLICT` | Дубликат `serialNumber` |
| 409 | `EQUIPMENT_HAS_OPEN_REQUESTS` | Удаление оборудования с открытыми заявками |
| 409 | `INVALID_STATUS_TRANSITION` | Недопустимый переход статуса |
| 422 | `VALIDATION_ERROR` | Тело/параметры не прошли валидацию |
| 429 | `TOO_MANY_REQUESTS` | Превышен лимит частоты запросов |
| 500 | `INTERNAL_ERROR` | Внутренняя ошибка сервера |
| 502 | `UPSTREAM_ERROR` / `UPSTREAM_BAD_JSON` | Ошибка внешнего API |
| 503 | `UPSTREAM_UNAVAILABLE` | Внешний API недоступен |
| 504 | `UPSTREAM_TIMEOUT` | Превышен таймаут внешнего API |

В режиме `NODE_ENV=production` стек-трейсы и внутренние сообщения в ответ
не попадают.

---

## Примеры запросов и ответов

### Создание оборудования (успех)

**Запрос:**

```http
POST /api/equipment
Content-Type: application/json

{
  "name": "Turbine A1",
  "type": "turbine",
  "serialNumber": "SN-001",
  "location": { "lat": 56.3, "lon": 44.0 },
  "installedAt": "2024-01-15"
}
```

**Ответ 201 Created** (заголовок `Location: /api/equipment/{id}`):

```json
{
  "data": {
    "id": "8f1c9d47-3a2e-4b1c-9e5d-1234567890ab",
    "name": "Turbine A1",
    "type": "turbine",
    "serialNumber": "SN-001",
    "location": { "lat": 56.3, "lon": 44.0 },
    "status": "operational",
    "installedAt": "2024-01-15T00:00:00.000Z",
    "createdAt": "2026-09-23T10:15:00.000Z",
    "updatedAt": "2026-09-23T10:15:00.000Z"
  }
}
```

### Дубликат серийного номера (409)

```json
{
  "error": {
    "code": "SERIAL_NUMBER_CONFLICT",
    "message": "Оборудование с серийным номером «SN-001» уже существует",
    "requestId": "c1f2..."
  }
}
```

### Ошибка валидации (422)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные запроса",
    "details": [
      { "field": "name", "message": "\"name\" length must be at least 3 characters long" },
      { "field": "type", "message": "\"type\" is required" }
    ],
    "requestId": "d2e3..."
  }
}
```

### Смена статуса заявки (успех)

**Запрос:**

```http
PATCH /api/requests/{id}/status
Content-Type: application/json

{ "status": "in_progress" }
```

**Ответ 200 OK:**

```json
{ "data": { "id": "...", "status": "in_progress", "updatedAt": "..." } }
```

### Недопустимый переход статуса (409)

**Запрос:**

```http
PATCH /api/requests/{id}/status

{ "status": "done" }
```

Если текущий статус `new`, ответ:

```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Недопустимый переход статуса: new → done",
    "requestId": "..."
  }
}
```

### Прогноз погоды и пригодность окна

**Запрос:**

```http
GET /api/equipment/{id}/weather?days=3
```

**Ответ 200 OK:**

```json
{
  "data": {
    "equipmentId": "8f1c9d47-...",
    "forecast": [
      {
        "date": "2026-09-23",
        "temperatureMax": 14.2,
        "temperatureMin": 6.8,
        "precipitation": 0.0,
        "windSpeedMax": 7.4,
        "suitable": true
      }
    ]
  }
}
```

Если внешний API недоступен, эндпоинт вернёт **503 Service Unavailable**
с кодом `UPSTREAM_UNAVAILABLE`.

---

## Безопасность

### CORS

CORS настроен с **явным списком** разрешённых источников — они берутся из
переменной окружения `CORS_ORIGINS`. По умолчанию:

```
http://localhost:3000
http://localhost:5173
```

- `http://localhost:3000` — локальный запуск самого API (для отладки через браузер).
- `http://localhost:5173` — стандартный порт Vite, если фронтенд-приложение
  разрабатывается локально.

Использование `*` **не допускается** — это открыло бы API для любого сайта.
Чтобы добавить новый источник, поправь `CORS_ORIGINS` в `.env`.

### Rate limiting

На все маршруты `/api` наложено ограничение частоты запросов: не более
`RATE_LIMIT_MAX` (по умолчанию 100) за `RATE_LIMIT_WINDOW_MS`
(по умолчанию 60 секунд) с одного IP.

При превышении:

- **HTTP 429 Too Many Requests**
- Заголовки `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
  (`standardHeaders: true`)

### Защитные HTTP-заголовки

Подключён **helmet** — устанавливает `Content-Security-Policy`,
`X-Content-Type-Options`, `Strict-Transport-Security`, `Cross-Origin-*` и другие.

### Ограничение размера тела запроса

`express.json({ limit: '100kb' })` — защита от запросов с огромным телом.

### Cookies

Сервис **не использует cookies**. Если в будущем добавится аутентификация
по сессии, будут выставлены флаги `HttpOnly`, `Secure`, `SameSite=Lax`.
`SameSite=Lax` выбран как компромисс: разрешает топ-навигацию (переход по ссылке
из внешнего источника) и блокирует cross-site POST-запросы, что защищает от CSRF.

### Секреты

Все настройки — в переменных окружения. Файл `.env` добавлен в `.gitignore`.
Шаблон без секретов — `.env.example` — хранится в репозитории.

---

## Структура проекта

```
maintenance-api/
├── src/
│   ├── config/           # чтение env, единый объект config
│   ├── errors/           # AppError, NotFoundError, ValidationError, ConflictError
│   ├── middlewares/      # requestId, logger, validate, notFound, errorHandler
│   ├── routes/           # маршруты (index, health, equipment, requests)
│   ├── controllers/      # тонкие контроллеры (только req/res)
│   ├── services/         # бизнес-логика (equipment, requests, weather)
│   ├── repositories/     # доступ к данным (base, equipment, requests)
│   ├── validators/       # Joi-схемы для body/params/query
│   ├── utils/            # asyncHandler, httpClient
│   ├── app.js            # сборка Express-приложения
│   └── server.js         # запуск сервера
├── docs/postman/         # экспортированная коллекция Postman
├── tests/                # тесты API (Jest + Supertest)
├── data/                 # JSON-файлы хранилища (в .gitignore)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

**Слоистая архитектура:** запрос идёт по цепочке
`routes → controllers → services → repositories`. Бизнес-логика — только
в сервисах, работа с данными — только в репозиториях. Такая изоляция позволяет
на следующем этапе заменить JSON-хранилище на PostgreSQL без изменения сервисов
и контроллеров.

---

## Скрипты

| Команда | Действие |
|---|---|
| `npm start` | Запуск сервера |
| `npm run dev` | Запуск с автоперезапуском (`node --watch`) |
| `npm run lint` | Проверка ESLint |
| `npm run lint:fix` | ESLint с автоисправлением |
| `npm run format` | Форматирование Prettier |
| `npm run format:check` | Проверка форматирования |
| `npm test` | Запуск тестов |

---

## Тестирование в Postman

Коллекция со всеми запросами и примерами ответов лежит в
`docs/postman/maintenance-api.postman_collection.json`.

Импорт:

1. Открой Postman → **File → Import**.
2. Выбери JSON-файл из `docs/postman/`.
3. Установи переменную окружения `baseUrl` = `http://localhost:3000/api`.

Коллекция содержит как успешные, так и негативные сценарии (400/404/409/422/429),
а также автотесты `pm.test(...)` на код ответа и структуру тела.

---

## Docker

```bash
docker build -t maintenance-api .
docker run --rm -p 3000:3000 --env-file .env maintenance-api
```

Или через Docker Compose:

```bash
docker compose up --build
```

---

## Схема базы данных

### ER-диаграмма

```
┌──────────────────┐
│      sites       │
│  id (PK)         │
│  name            │
│  code (UNIQUE)   │
│  region          │
│  latitude        │
│  longitude       │
└────────┬─────────┘
         │ 1
         │
         │ N
┌────────▼─────────┐        ┌────────────────────────┐
│    equipment     │ 1────1 │ equipment_passports    │
│  id (PK)         │        │  equipment_id (U, FK)  │
│  site_id (FK)    │        │  manufacturer          │
│  name            │        │  model                 │
│  type (ENUM)     │        │  rated_power_kw        │
│  serial_number(U)│        │  last_inspection_at    │
│  status (ENUM)   │        └────────────────────────┘
│  installed_at    │
└────────┬─────────┘
         │ 1
         │
         │ N
┌────────▼────────────────┐        ┌───────────────────────┐
│  maintenance_requests   │ 1────N │ request_status_history│
│  id (PK)                │        │  request_id (FK)      │
│  equipment_id (FK)      │        │  from_status (ENUM)   │
│  title                  │        │  to_status (ENUM)     │
│  description            │        │  author, comment      │
│  priority (ENUM)        │        │  created_at           │
│  status (ENUM)          │        └───────────────────────┘
│  planned_at             │
│  author                 │
│  closed_at              │
└────────┬────────────────┘
         │ N
         │
         │ N         ┌────────────────────────┐
         └──────────▶│   request_assignees    │
                     │  request_id (PK, FK)   │
                     │  technician_id (PK, FK)│
                     │  role (ENUM)           │
                     │  hours (CHECK > 0)     │
                     └───────────┬────────────┘
                                 │ N
                                 │
                     ┌───────────▼────────────┐
                     │      technicians       │
                     │  id (PK)               │
                     │  full_name             │
                     │  specialization        │
                     │  employee_number(U)    │
                     └────────────────────────┘
```

### Описание таблиц

| Таблица | Назначение | Ключевые ограничения |
|---|---|---|
| `sites` | Производственные площадки | `code` UNIQUE |
| `equipment` | Оборудование на площадках | `serial_number` UNIQUE, `site_id` FK ON DELETE RESTRICT |
| `equipment_passports` | Паспорта (1:1) | `equipment_id` UNIQUE, FK ON DELETE CASCADE |
| `maintenance_requests` | Заявки на обслуживание | `equipment_id` FK ON DELETE RESTRICT |
| `request_status_history` | Журнал смены статусов (append-only) | нет `updated_at`, записи не редактируются |
| `technicians` | Специалисты | `employee_number` UNIQUE |
| `request_assignees` | Назначения бригад (N:M) | составной PK `(request_id, technician_id)`, `hours > 0` |

### Связи

| Связь | Тип | Реализация |
|---|---|---|
| `sites` → `equipment` | 1:N | `equipment.site_id` — FK |
| `equipment` → `equipment_passports` | 1:1 | `equipment_passports.equipment_id` — UNIQUE FK |
| `equipment` → `maintenance_requests` | 1:N | `maintenance_requests.equipment_id` — FK |
| `maintenance_requests` → `request_status_history` | 1:N | `request_status_history.request_id` — FK |
| `maintenance_requests` ↔ `technicians` | N:M | через `request_assignees` с полями `role`, `hours` |

### Обоснование третьей нормальной формы (3НФ)

1. **1НФ** — все атрибуты атомарные, массивы и повторяющиеся группы отсутствуют.
2. **2НФ** — все не-ключевые атрибуты зависят от полного первичного ключа. В `request_assignees` поля `role` и `hours` зависят от **составного ключа** `(request_id, technician_id)`, а не от его части.
3. **3НФ** — транзитивных зависимостей нет:
   - Название площадки хранится только в `sites` (не дублируется в `equipment`).
   - Производитель оборудования хранится только в `equipment_passports`.
   - Специализация специалиста — только в `technicians`.

### Правила `ON DELETE`

| Связь | Правило | Почему |
|---|---|---|
| `equipment.site_id` | `RESTRICT` | Нельзя удалить площадку с оборудованием |
| `equipment_passports.equipment_id` | `CASCADE` | Паспорт не имеет смысла без оборудования |
| `maintenance_requests.equipment_id` | `RESTRICT` | Нельзя удалить оборудование с заявками (дополнительно проверяется в сервисе для 409) |
| `request_status_history.request_id` | `CASCADE` | История удаляется вместе с заявкой |
| `request_assignees.request_id` | `CASCADE` | Назначения удаляются вместе с заявкой |
| `request_assignees.technician_id` | `RESTRICT` | Нельзя удалить специалиста, назначенного на заявки |

## Развёртывание с нуля

### 1. Клонировать репозиторий

```bash
git clone https://github.com/ulianderson33/maintenance-api.git
cd maintenance-api
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Скопировать переменные окружения

```bash
cp .env.example .env
```

### 4. Запустить PostgreSQL

```bash
docker compose up -d db
```

Дождаться статуса `healthy`:

```bash
docker compose ps
# maintenance-db   postgres:16-alpine   Up (healthy)   0.0.0.0:5432->5432/tcp
```

### 5. Применить миграции

```bash
npm run db:migrate
```

### 6. Наполнить базу демо-данными

```bash
npm run db:seed
```

Будут созданы: 3 площадки, 7 единиц оборудования, 5 специалистов, 22 заявки, история статусов и назначения.

### 7. Запустить приложение

```bash
npm run dev
```

Сервер будет доступен на `http://localhost:3000`. Проверка:

```bash
curl http://localhost:3000/api/health
# {"data":{"status":"ok"}}
```

## Откат миграций

Полный откат схемы (удаляются все таблицы):

```bash
npm run db:migrate:undo:all
```

Откат последней миграции:

```bash
npm run db:migrate:undo
```

Полный сброс с пересозданием:

```bash
npm run db:reset
```

Скрипт `db:reset` последовательно выполняет: откат всех миграций → применение всех миграций → запуск сидов.

## Аналитические отчёты

### Сводка по площадке — `GET /api/sites/:id/summary`

Возвращает:
- количество заявок в разрезе статусов;
- количество заявок в разрезе приоритетов;
- среднее время закрытия заявки в часах.

Пример ответа:

```json
{
  "data": {
    "site": { "id": "...", "name": "Северный ветропарк", "code": "WP-NORTH", "region": "Мурманская обл." },
    "byStatus": [
      { "status": "new", "count": 5 },
      { "status": "in_progress", "count": 3 },
      { "status": "done", "count": 4 }
    ],
    "byPriority": [
      { "priority": "high", "count": 6 },
      { "priority": "critical", "count": 2 }
    ],
    "avgCloseHours": "18.50"
  }
}
```

### Отчёт по нагрузке на оборудование — `GET /api/reports/equipment-load`

Параметры запроса:
- `from` — начало периода (ISO-дата, опционально);
- `to` — конец периода (ISO-дата, опционально);
- `minRequests` — минимальное число заявок (фильтрация групп, `HAVING`, по умолчанию 1);
- `page`, `limit` — пагинация.

Для каждого оборудования возвращает:
- `total_requests` — общее число заявок;
- `closed_requests` — число закрытых (`closed_at IS NOT NULL`);
- `total_hours` — суммарные плановые трудозатраты (сумма `request_assignees.hours`);
- `last_service_at` — дата последнего закрытия заявки.

Реализован **прямым SQL-запросом** с `LEFT JOIN`, `GROUP BY` и `HAVING`. Параметры передаются через `replacements` (bind), конкатенация пользовательского ввода запрещена.

Пример:

```bash
curl "http://localhost:3000/api/reports/equipment-load?from=2026-01-01&minRequests=2"
```
## Аутентификация

Регистрация: `POST /api/auth/register` — по умолчанию роль `viewer`.
Первого администратора нужно назначить вручную:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Вход: `POST /api/auth/login`. Возвращает access-токен (15 мин) и ставит cookie refresh-токена (7 дней, HttpOnly, Secure, SameSite=Lax).
Обновление: `POST /api/auth/refresh`.
Выход: `POST /api/auth/logout`.

### Роли и права

| Роль | Права |
|---|---|
| viewer | Чтение всех данных |
| technician | viewer + создание/редактирование заявок + смена статуса своих заявок |
| admin | Всё, включая управление оборудованием, площадками, специалистами и удаление |

### SameSite = Lax

Выбрано значение `Lax`: cookie отправляется при top-level navigation (переход по ссылке), но не при cross-site AJAX. Это блокирует CSRF через сторонние формы и XHR, но позволяет прямые переходы. В production с HTTPS устанавливается `Secure=true`.

## Развёртывание

```bash
git clone https://github.com/ulianderson33/maintenance-api.git
cd maintenance-api
cp .env.example .env
docker compose up -d
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
```

После этого:
- API доступен на `http://localhost/api/...` (через Nginx).
- Swagger UI: `http://localhost/api/docs`.
- Grafana: `http://localhost/grafana/` (admin/admin по умолчанию).

### Порты

- **Снаружи** открыт только **80** (Nginx).
- API и PostgreSQL доступны только внутри Docker-сети.
- Prometheus не публикуется.

## Мониторинг

### Доступ к Grafana

`http://localhost/grafana/`, логин `admin`, пароль `admin` (или из `GRAFANA_ADMIN_PASSWORD`).

### Панели

**Технические:**
- Request rate (по маршрутам).
- Доля ответов 4xx / 5xx.
- p95 времени ответа.
- Up (liveness).

**Прикладные:**
- Заявки по статусам.
- Заявки по приоритетам.
- Среднее время закрытия.
- Нагрузка на оборудование.
- Просроченные плановые работы.

### Оповещения

Настроено оповещение на 5xx > 5% за 5 минут.

**Порядок действий:**
1. Открыть Grafana → панель «5xx rate».
2. Проверить логи API: `docker compose logs api | grep ERROR`.
3. Проверить БД: `docker compose exec db pg_isready`.
4. Если это ошибка внешнего API — проверить доступность `api.open-meteo.com`.
5. Откатить последний деплой: `git revert <commit> && docker compose up -d --build`.

## Эксплуатация

### Логи

```bash
docker compose logs -f api
docker compose logs -f nginx
```

Логи структурированы (JSON). Уровень задаётся `LOG_LEVEL`.

### Метрики

- API: `http://api:3000/metrics` (внутри сети).
- Grafana: `http://localhost/grafana/`.

### Типовые отказы

**БД недоступна** → `/api/health/ready` вернёт 503. Причина в логах `api`. Решение: `docker compose restart db`.
**Рост 5xx** → панель 5xx rate в Grafana → логи api → проверить последние коммиты.
**Переполнение диска** → `docker system df` → `docker system prune`.
**Откат миграции** → `docker compose exec api npm run db:migrate:undo`.

## Архитектурные решения

- Слоистая архитектура (routes → controllers → services → repositories).
- JWT access + refresh в HttpOnly cookie.
- Разграничение по ролям через middleware.
- Nginx как reverse proxy с пробросом X-Forwarded-*.
- Метрики через prom-client + Prometheus + Grafana.
- Структурированные JSON-логи с requestId.
- Graceful shutdown по SIGTERM.

## Ограничения

- Нет HTTPS в базовой конфигурации (только HTTP, порт 80).
- Refresh-токены не отзываются (stateless JWT).
- Rate limiting в памяти (при горизонтальном масштабировании нужен Redis).
## HTTPS

Стек разворачивается с HTTPS через Nginx (порт 443) и автоматическим
редиректом с HTTP (порт 80).

### Генерация самоподписанного сертификата (для разработки)

```bash
mkdir -p deploy/nginx/certs
docker run --rm -v "$(pwd)/deploy/nginx/certs:/certs" alpine/openssl \
  req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /certs/server.key -out /certs/server.crt \
  -subj "/CN=localhost"
```

**Windows (PowerShell):**

```powershell
New-Item -ItemType Directory -Force -Path deploy\nginx\certs
docker run --rm -v "${PWD}/deploy/nginx/certs:/certs" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj "/CN=localhost"
```

### Результат

- `https://localhost` — HTTPS-эндпоинт.
- `http://localhost` — редирект 301 на HTTPS (кроме `/nginx-health`).
- HSTS заголовок `Strict-Transport-Security`.

### В продакшене

Используйте сертификат от доверенного центра (Let's Encrypt, DigiCert).
Самоподписанный — только для разработки и демонстрации.