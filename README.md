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

## Лицензия

MIT