# Maintenance API

REST API на Express для учёта заявок на техническое обслуживание оборудования
производственной площадки (например, ветропарка). Сервис ведёт справочник
оборудования и заявок, контролирует жизненный цикл заявки, поддерживает
аутентификацию с ролевой моделью, разворачивается полным стеком за Nginx
с HTTPS и подключается к мониторингу Prometheus + Grafana.

## Содержание

- [Требования к окружению](#требования-к-окружению)
- [Быстрый старт](#быстрый-старт)
- [Переменные окружения](#переменные-окружения)
- [Эндпоинты API](#эндпоинты-api)
- [Аутентификация и роли](#аутентификация-и-роли)
- [Модель данных](#модель-данных)
- [Жизненный цикл заявки](#жизненный-цикл-заявки)
- [Формат ошибок](#формат-ошибок)
- [Примеры запросов](#примеры-запросов)
- [Безопасность](#безопасность)
- [Мониторинг](#мониторинг)
- [Тестирование](#тестирование)
- [Структура проекта](#структура-проекта)
- [Развёртывание с нуля](#развёртывание-с-нуля)
- [Откат миграций](#откат-миграций)
- [Эксплуатация](#эксплуатация)
- [Архитектурные решения](#архитектурные-решения)
- [Ограничения](#ограничения)

---

## Требования к окружению

- **Node.js** 20 или выше
- **npm** 10 или выше
- **Docker Desktop** (или Docker Engine + Docker Compose v2)
- **Git**
- Свободные порты: **80**, **443**, **3001** (Grafana), **5432** (PostgreSQL)

---

## Быстрый старт

Полная последовательность для Windows (PowerShell):

```powershell
# 1. Клонировать репозиторий
git clone https://github.com/ulianderson33/maintenance-api.git
cd maintenance-api

# 2. Установить Node-зависимости (нужны для миграций и тестов с хоста)
npm install

# 3. Создать .env из шаблона
copy .env.example .env

# 4. Сгенерировать SSL-сертификат для HTTPS
New-Item -ItemType Directory -Force -Path deploy\nginx\certs | Out-Null
docker run --rm -v "${PWD}/deploy/nginx/certs:/certs" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj "/CN=localhost"

# 5. Запустить полный стек (Nginx + API + PostgreSQL + Prometheus + Grafana)
docker compose up -d --build

# 6. Дождаться готовности (10–15 секунд)
docker compose ps

# 7. Применить миграции
docker compose exec api npm run db:migrate

# 8. Залить демо-данные
docker compose exec api npm run db:seed

# 9. Создать первого администратора
'{"email":"admin@test.com","password":"admin12345","fullName":"Admin User"}' | Out-File -Encoding utf8 register.json
curl.exe -k -X POST https://localhost/api/auth/register -H "Content-Type: application/json" -d "@register.json"
docker compose exec db psql -U maintenance -d maintenance -c "UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';"

# 10. Удалить временный файл
Remove-Item register.json
```

**Для Linux / macOS** — то же самое, но с `cp` и `$(pwd)` (см. раздел [Развёртывание с нуля](#развёртывание-с-нуля)).

После запуска:

- **API:** `https://localhost/api/...`
- **Swagger UI:** `https://localhost/api/docs`
- **Grafana:** `https://localhost/grafana/` (логин `admin` / `admin`)
- **Редирект:** `http://localhost` → `https://localhost` (301)

---

## Переменные окружения

Все параметры задаются через переменные окружения. Шаблон — `.env.example`.

### Сервер

| Переменная              | По умолчанию     | Описание                                                  |
| ----------------------- | ---------------- | --------------------------------------------------------- |
| `PORT`                  | `3000`           | Порт HTTP-сервера внутри контейнера                        |
| `NODE_ENV`              | `production`     | Режим работы (`development` / `production` / `test`)      |
| `LOG_LEVEL`             | `info`           | Уровень логирования (`debug` / `info` / `warn` / `error`) |

### База данных

| Переменная           | По умолчанию            | Описание                       |
| -------------------- | ----------------------- | ------------------------------ |
| `DB_HOST`            | `db`                    | Хост PostgreSQL                |
| `DB_PORT`            | `5432`                  | Порт PostgreSQL                |
| `DB_NAME`            | `maintenance`           | Имя базы данных                |
| `DB_USER`            | `maintenance`           | Пользователь                   |
| `DB_PASSWORD`        | `maintenance_secret`    | Пароль                         |
| `DB_POOL_MAX`        | `10`                    | Максимум соединений в пуле     |
| `DB_POOL_MIN`        | `0`                     | Минимум соединений в пуле      |
| `DB_POOL_ACQUIRE`    | `30000`                 | Таймаут получения соединения   |
| `DB_POOL_IDLE`       | `10000`                 | Таймаут простоя соединения     |

### Аутентификация

| Переменная               | По умолчанию                        | Описание                                  |
| ------------------------ | ----------------------------------- | ----------------------------------------- |
| `JWT_ACCESS_SECRET`      | `dev_access_secret_change_me`       | Секрет подписи access-токена              |
| `JWT_REFRESH_SECRET`     | `dev_refresh_secret_change_me`      | Секрет подписи refresh-токена             |
| `JWT_ACCESS_EXPIRES_IN`  | `15m`                               | Время жизни access-токена                 |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                                | Время жизни refresh-токена                |
| `BCRYPT_ROUNDS`          | `10`                                | Количество раундов хеширования пароля     |
| `COOKIE_SECURE`          | `false`                             | Флаг `Secure` у refresh-cookie (для HTTPS — `true`) |
| `COOKIE_SAMESITE`        | `lax`                               | Флаг `SameSite` (`strict` / `lax` / `none`) |
| `COOKIE_DOMAIN`          | (пусто)                             | Домен cookie                              |

### CORS и ограничения

| Переменная                  | По умолчанию                                            | Описание                             |
| --------------------------- | ------------------------------------------------------- | ------------------------------------ |
| `CORS_ORIGINS`              | `https://localhost,http://localhost,http://localhost:3000` | Разрешённые источники (через запятую) |
| `RATE_LIMIT_WINDOW_MS`      | `60000`                                                 | Окно rate-limit, мс                  |
| `RATE_LIMIT_MAX`            | `100`                                                   | Максимум запросов в окне             |

### Внешние API

| Переменная                      | По умолчанию                                       | Описание                                |
| ------------------------------- | -------------------------------------------------- | --------------------------------------- |
| `WEATHER_API_URL`               | `https://api.open-meteo.com/v1/forecast`           | URL внешнего API прогноза               |
| `GEOCODING_API_URL`             | `https://geocoding-api.open-meteo.com/v1/search`   | URL геокодинга                          |
| `REQUEST_TIMEOUT_MS`            | `5000`                                             | Таймаут запроса к внешнему API          |
| `WEATHER_MAX_WIND_MS`           | `10`                                               | Порог скорости ветра для пригодности    |
| `WEATHER_MAX_PRECIPITATION_MM`  | `0.5`                                              | Порог осадков для пригодности           |

### Grafana

| Переменная                | По умолчанию | Описание              |
| ------------------------- | ------------ | --------------------- |
| `GRAFANA_ADMIN_USER`      | `admin`      | Логин администратора  |
| `GRAFANA_ADMIN_PASSWORD`  | `admin`      | Пароль администратора |

---

## Эндпоинты API

Все запросы к API начинаются с `/api`.

### Health

| Метод | Путь                    | Назначение                              |
| ----- | ----------------------- | --------------------------------------- |
| `GET` | `/api/health`           | Проверка доступности сервиса            |
| `GET` | `/api/health/live`      | Жизнеспособность процесса               |
| `GET` | `/api/health/ready`     | Готовность (проверяет доступность БД)   |

### Аутентификация

| Метод  | Путь                    | Назначение                          |
| ------ | ----------------------- | ----------------------------------- |
| `POST` | `/api/auth/register`    | Регистрация (по умолчанию `viewer`) |
| `POST` | `/api/auth/login`       | Вход (access + refresh-cookie)      |
| `POST` | `/api/auth/refresh`     | Обновление access-токена            |
| `POST` | `/api/auth/logout`      | Выход                               |

### Оборудование

| Метод    | Путь                          | Назначение                            |
| -------- | ----------------------------- | ------------------------------------- |
| `GET`    | `/api/equipment`              | Список (фильтры, сортировка, пагинация) |
| `POST`   | `/api/equipment`              | Создание (admin)                      |
| `GET`    | `/api/equipment/:id`          | Карточка                              |
| `PATCH`  | `/api/equipment/:id`          | Обновление (admin)                    |
| `DELETE` | `/api/equipment/:id`          | Удаление (admin, 409 при открытых заявках) |
| `GET`    | `/api/equipment/:id/requests` | Заявки по оборудованию                |
| `GET`    | `/api/equipment/:id/weather`  | Прогноз и пригодность окна            |

### Заявки

| Метод    | Путь                                  | Назначение                                     |
| -------- | ------------------------------------- | ---------------------------------------------- |
| `GET`    | `/api/requests`                       | Список (фильтры, сортировка, пагинация)        |
| `POST`   | `/api/requests`                       | Создание (technician / admin)                  |
| `GET`    | `/api/requests/:id`                   | Карточка                                       |
| `PATCH`  | `/api/requests/:id`                   | Редактирование полей                           |
| `PATCH`  | `/api/requests/:id/status`            | Смена статуса (проверка перехода)              |
| `DELETE` | `/api/requests/:id`                   | Удаление (admin)                               |
| `POST`   | `/api/requests/:id/assignees`         | Назначение бригады (admin)                     |
| `DELETE` | `/api/requests/:id/assignees/:userId` | Снятие специалиста (admin)                     |
| `GET`    | `/api/requests/:id/history`           | История изменений статуса                      |

### Аналитика

| Метод | Путь                            | Назначение                                     |
| ----- | ------------------------------- | ---------------------------------------------- |
| `GET` | `/api/sites/:id/summary`        | Сводка по площадке                             |
| `GET` | `/api/reports/equipment-load`   | Нагрузка на оборудование (raw SQL)             |

### Документация и метрики

| Метод | Путь          | Назначение                                |
| ----- | ------------- | ----------------------------------------- |
| `GET` | `/api/docs`   | Swagger UI (интерактивная документация)   |
| `GET` | `/metrics`    | Prometheus-метрики (только внутри сети)   |

---

## Аутентификация и роли

### Схема

- **Access-токен** — JWT, срок жизни **15 минут**, передаётся в заголовке
  `Authorization: Bearer <token>`.
- **Refresh-токен** — JWT, срок жизни **7 дней**, передаётся в **HttpOnly cookie**
  с флагами `Secure` (в production с HTTPS) и `SameSite=Lax`.
- **Пароли** хранятся в виде bcrypt-хеша с солью (10 раундов).
- **Хеши и пароли** не возвращаются в ответах API и не попадают в логи.

### Роли

| Роль         | Права                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| `viewer`     | Чтение всех данных                                                          |
| `technician` | `viewer` + создание/редактирование заявок + смена статуса **своих** заявок  |
| `admin`      | Всё, включая управление оборудованием, площадками, специалистами и удаление |

### Коды ответов

- **401 Unauthorized** — запрос без токена или с истёкшим токеном.
- **403 Forbidden** — токен валиден, но роль не подходит.
- **429 Too Many Requests** — превышен rate limit на login (5 попыток / 15 минут).

### Первый администратор

Сервис **не создаёт администратора автоматически** — это осознанное решение,
чтобы в публичном репозитории не было дефолтных учётных данных.

Порядок создания:

1. Зарегистрировать пользователя через `POST /api/auth/register` — он получит
   роль `viewer`.
2. Назначить роль `admin` через SQL:

   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
   ```

В продакшене вместо SQL используется CLI-команда или скрипт развёртывания,
недоступный публично.

### Почему `SameSite=Lax`

Значение `Lax` — компромисс:

- cookie **отправляется** при top-level navigation (переход по ссылке с другого сайта);
- cookie **не отправляется** при cross-site AJAX/POST — это блокирует CSRF.

`Strict` блокировал бы и переходы по ссылкам (пользователь «разлогинивался» бы
при клике на ссылку из письма). `None` требует `Secure` и применяется только
для cross-site сценариев.

---

## Модель данных

### Схема БД (ER-диаграмма)

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
         │ 1:N
┌────────▼─────────┐        ┌────────────────────────┐
│    equipment     │ 1:1    │ equipment_passports    │
│  id (PK)         │◄──────►│  equipment_id (U, FK)  │
│  site_id (FK)    │        │  manufacturer          │
│  type (ENUM)     │        │  model                 │
│  serial_number(U)│        │  rated_power_kw        │
│  status (ENUM)   │        │  last_inspection_at    │
│  installed_at    │        └────────────────────────┘
└────────┬─────────┘
         │ 1:N
┌────────▼────────────────┐        ┌───────────────────────┐
│  maintenance_requests   │ 1:N    │ request_status_history│
│  id (PK)                │◄──────►│  request_id (FK)      │
│  equipment_id (FK)      │        │  from_status (ENUM)   │
│  title, priority, status│        │  to_status (ENUM)     │
│  planned_at, closed_at  │        │  author, comment      │
└────────┬────────────────┘        └───────────────────────┘
         │ N:M через request_assignees
┌────────▼──────────┐
│   technicians     │
│  full_name        │
│  specialization   │
│  employee_number(U)│
└───────────────────┘
```

### 3НФ

- **1НФ** — атомарные атрибуты.
- **2НФ** — все не-ключевые поля зависят от полного первичного ключа.
  В `request_assignees` `role` и `hours` зависят от пары `(request_id, technician_id)`.
- **3НФ** — нет транзитивных зависимостей. Название площадки — только в `sites`,
  производитель — только в `equipment_passports`, специализация — только в `technicians`.

### Правила `ON DELETE`

| Связь                               | Правило    | Обоснование                                                    |
| ----------------------------------- | ---------- | -------------------------------------------------------------- |
| `equipment.site_id`                 | `RESTRICT` | Нельзя удалить площадку с оборудованием                         |
| `equipment_passports.equipment_id`  | `CASCADE`  | Паспорт не имеет смысла без оборудования                        |
| `maintenance_requests.equipment_id` | `RESTRICT` | Нельзя удалить оборудование с заявками                          |
| `request_status_history.request_id` | `CASCADE`  | История удаляется вместе с заявкой                              |
| `request_assignees.request_id`      | `CASCADE`  | Назначения удаляются вместе с заявкой                           |
| `request_assignees.technician_id`   | `RESTRICT` | Нельзя удалить специалиста, назначенного на заявки              |

---

## Жизненный цикл заявки

```
new ──────► in_progress ──────► done
 │              │
 │              ▼
 └──────────► rejected
```

| Из            | В                         |
| ------------- | ------------------------- |
| `new`         | `in_progress`, `rejected` |
| `in_progress` | `done`, `rejected`        |
| `done`        | — (терминальное)          |
| `rejected`    | — (терминальное)          |

Недопустимый переход → **409 Conflict** (`INVALID_STATUS_TRANSITION`).
Нельзя перевести в `in_progress` без назначенных исполнителей → **409** (`NO_ASSIGNEES`).

---

## Формат ошибок

Все ошибки возвращаются в едином формате:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные запроса",
    "details": [{ "field": "priority", "message": "Недопустимое значение" }],
    "requestId": "b1f2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
  }
}
```

| Код HTTP | `code`                              | Когда возникает                            |
| -------- | ----------------------------------- | ------------------------------------------ |
| 400      | `BAD_REQUEST`                       | Некорректный запрос                        |
| 401      | `UNAUTHORIZED`                      | Нет токена / истёкший токен                |
| 403      | `FORBIDDEN`                         | Нет прав для операции                      |
| 404      | `NOT_FOUND`                         | Ресурс не найден                           |
| 409      | `SERIAL_NUMBER_CONFLICT`            | Дубликат `serial_number`                   |
| 409      | `EQUIPMENT_HAS_OPEN_REQUESTS`       | Удаление оборудования с открытыми заявками |
| 409      | `INVALID_STATUS_TRANSITION`         | Недопустимый переход статуса               |
| 409      | `NO_ASSIGNEES`                      | Нет исполнителей для `in_progress`         |
| 422      | `VALIDATION_ERROR`                  | Ошибка валидации                           |
| 429      | `TOO_MANY_REQUESTS`                 | Превышен rate limit                        |
| 500      | `INTERNAL_ERROR`                    | Внутренняя ошибка сервера                  |
| 502/503  | `UPSTREAM_ERROR` / `UPSTREAM_UNAVAILABLE` | Внешний API недоступен              |
| 504      | `UPSTREAM_TIMEOUT`                  | Таймаут внешнего API                       |

В `NODE_ENV=production` стек-трейсы и внутренние сообщения в ответ не попадают.

---

## Примеры запросов

### Логин

```bash
curl -k -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin12345"}'
```

**Ответ:**

```json
{
  "data": {
    "user": { "id": "...", "email": "admin@test.com", "role": "admin" },
    "accessToken": "eyJhbGciOiJIUzI1NiI..."
  }
}
```

Заголовок `Set-Cookie: refresh_token=...; HttpOnly; SameSite=Lax; Path=/api/auth`.

### Список оборудования (с токеном)

```bash
curl -k https://localhost/api/equipment \
  -H "Authorization: Bearer <accessToken>"
```

### Создание заявки

```bash
curl -k -X POST https://localhost/api/requests \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"<uuid>","title":"Плановое ТО","priority":"high"}'
```

### Смена статуса

```bash
curl -k -X PATCH https://localhost/api/requests/<id>/status \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

---

## Безопасность

### HTTPS

Nginx терминирует SSL на порту 443. HTTP автоматически редиректится на HTTPS
с кодом 301. Установлен заголовок **HSTS** (`Strict-Transport-Security`).

### CORS

Список разрешённых источников задаётся в `CORS_ORIGINS` (через запятую).
`*` не допускается — это открыло бы API для любого сайта.

### Rate limiting

На все маршруты `/api` наложено ограничение: не более `RATE_LIMIT_MAX`
(по умолчанию 100) за `RATE_LIMIT_WINDOW_MS` (60 секунд) с одного IP.
На **login** — отдельный лимит: 5 попыток / 15 минут.

### Защитные HTTP-заголовки

**helmet** устанавливает `Content-Security-Policy`, `X-Content-Type-Options`,
`X-Frame-Options`, `Cross-Origin-*` и другие.

### Ограничение размера тела

`express.json({ limit: '100kb' })`.

### Секреты

Все настройки — в переменных окружения. `.env` в `.gitignore`,
шаблон `.env.example` — в репозитории. В продакшене **обязательно**
заменить дефолтные `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` на длинные
случайные значения.

---

## Мониторинг

### Prometheus

Приложение отдаёт метрики по адресу `/metrics` (только внутри Docker-сети):

- `http_requests_total{method,route,status}` — счётчик запросов.
- `http_request_duration_seconds` — гистограмма длительности.

### Grafana

Доступна на `https://localhost/grafana/` (логин `admin` / `admin`).
Datasources (Prometheus + Postgres) и дашборд подключаются автоматически через
provisioning.

**Панели:**

**Технические:** request rate, доля 4xx/5xx, p95 response time, liveness.

**Прикладные:** заявки по статусам и приоритетам, среднее время закрытия,
нагрузка на оборудование, просроченные работы.

### Оповещения

Настроен алерт на 5xx > 5% за 5 минут. Действия при срабатывании:

1. Открыть Grafana → панель «5xx rate».
2. Проверить логи: `docker compose logs api --tail=100`.
3. Проверить БД: `docker compose exec db pg_isready`.
4. При необходимости — откатить: `git revert <commit> && docker compose up -d --build`.

---

## Тестирование

```bash
# Убедиться, что тестовая БД создана
docker compose exec db psql -U maintenance -d maintenance -c "CREATE DATABASE maintenance_test;"

# Применить миграции к тестовой БД
NODE_ENV=test npx sequelize-cli db:migrate

# Запустить тесты
npm test
```

Ожидается **9 прошедших тестов**: unit (переходы статусов, правила назначения)
и integration (auth, CRUD, негативные сценарии).

---

## Структура проекта

```
maintenance-api/
├── src/
│   ├── config/           # чтение env, единый config
│   ├── db/               # Sequelize: config, migrations, seeders, models
│   ├── docs/             # Swagger/OpenAPI
│   ├── errors/           # AppError, NotFoundError, ConflictError, ValidationError
│   ├── metrics/          # prom-client регистры
│   ├── middlewares/      # requestId, logger, validate, auth, metrics, errorHandler
│   ├── routes/           # маршруты (index, health, auth, equipment, requests, sites, reports, metrics)
│   ├── controllers/      # тонкие контроллеры (req/res)
│   ├── services/         # бизнес-логика (equipment, requests, weather, auth, sites, reports)
│   ├── repositories/     # доступ к данным (Sequelize)
│   ├── validators/       # Joi-схемы
│   ├── utils/            # asyncHandler, httpClient
│   ├── app.js            # сборка Express-приложения
│   └── server.js         # запуск + graceful shutdown
├── deploy/
│   ├── nginx/            # конфиги Nginx + сертификаты (certs в .gitignore)
│   ├── prometheus/       # prometheus.yml
│   └── grafana/          # provisioning + dashboards
├── docs/postman/         # коллекция Postman
├── tests/                # unit + integration
├── load-tests/           # k6-скрипты
├── .github/workflows/    # CI (lint, test, build)
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Развёртывание с нуля

### 1. Клонировать репозиторий

```bash
git clone https://github.com/ulianderson33/maintenance-api.git
cd maintenance-api
```

### 2. Установить Node-зависимости

```bash
npm install
```

Нужны для миграций и тестов **с хоста**. Приложение в Docker использует свои
зависимости.

### 3. Скопировать переменные окружения

**Windows:**
```powershell
copy .env.example .env
```

**Linux / macOS:**
```bash
cp .env.example .env
```

### 4. Сгенерировать SSL-сертификат

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path deploy\nginx\certs | Out-Null
docker run --rm -v "${PWD}/deploy/nginx/certs:/certs" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -subj "/CN=localhost"
```

**Linux / macOS:**
```bash
mkdir -p deploy/nginx/certs
docker run --rm -v "$(pwd)/deploy/nginx/certs:/certs" alpine/openssl \
  req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /certs/server.key -out /certs/server.crt \
  -subj "/CN=localhost"
```

Сертификаты **не в Git** (в `.gitignore`) — генерируются локально.

### 5. Запустить полный стек

```bash
docker compose up -d --build
```

Запустятся **5 сервисов**:

- `nginx` — reverse proxy, HTTPS.
- `api` — Node.js приложение.
- `db` — PostgreSQL 16.
- `prometheus` — сбор метрик.
- `grafana` — дашборды.

Проверка:

```bash
docker compose ps
```

**Ожидается 5 контейнеров `Up` (api и db — `(healthy)`).**

### 6. Применить миграции

```bash
docker compose exec api npm run db:migrate
```

Создаст 9 таблиц: `users`, `sites`, `equipment`, `equipment_passports`,
`maintenance_requests`, `request_status_history`, `technicians`,
`request_assignees`, `SequelizeMeta`.

### 7. Заполнить демо-данными

```bash
docker compose exec api npm run db:seed
```

Будут созданы: 3 площадки, 7 единиц оборудования, 5 специалистов,
22 заявки, история статусов, назначения.

### 8. Создать первого администратора

```bash
# Регистрация (через curl)
curl -k -X POST https://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin12345","fullName":"Admin User"}'

# Назначить роль admin
docker compose exec db psql -U maintenance -d maintenance \
  -c "UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';"
```

### 9. Проверить работу

- API health: `curl -k https://localhost/api/health` → `{"data":{"status":"ok"}}`
- Swagger UI: `https://localhost/api/docs`
- Grafana: `https://localhost/grafana/` (admin / admin)
- Редирект: `curl -I http://localhost/api/health` → 301

---

## Откат миграций

```bash
# Откат последней миграции
docker compose exec api npm run db:migrate:undo

# Полный откат (удаляются все таблицы)
docker compose exec api npm run db:migrate:undo:all

# Полный сброс: откат + применение + сиды
docker compose exec api npm run db:reset
```

---

## Эксплуатация

### Логи

```bash
docker compose logs -f api        # API
docker compose logs -f nginx      # Nginx
docker compose logs --tail=50     # все сервисы
```

Логи структурированы (JSON), уровень задаётся `LOG_LEVEL`. Каждая запись
содержит `requestId` — по нему можно найти весь контекст запроса.

### Health-эндпоинты

- `/api/health/live` — процесс жив.
- `/api/health/ready` — БД доступна. При недоступной БД — **503**.

### Graceful shutdown

По `SIGTERM` (при `docker compose stop`) приложение:

1. Перестаёт принимать новые запросы.
2. Дообрабатывает текущие.
3. Закрывает соединения с БД.
4. Завершается с кодом 0.

### Типовые отказы

| Симптом                            | Диагностика                                             | Решение                               |
| ---------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| `/api/health/ready` → 503          | `docker compose logs db`                                | `docker compose restart db`           |
| Рост 5xx                           | Grafana → панель 5xx → логи api                        | Проверить последние коммиты, откатить |
| Nginx в `Restarting`               | `docker compose logs nginx`                             | Проверить сертификаты, перезапустить  |
| `sequelize-cli: not found` в api   | `docker compose exec api which sequelize-cli`           | Пересобрать образ (`--build`)         |
| Ошибки 429 на login                | Подождать 15 минут или `docker compose restart api`     | —                                     |

---

## Архитектурные решения

- **Слоистая архитектура** (routes → controllers → services → repositories → models).
- **PostgreSQL + Sequelize** с миграциями, транзакциями и блокировкой строк (`FOR UPDATE`).
- **JWT access + refresh** в HttpOnly cookie, bcrypt для паролей.
- **Разграничение прав** через `authenticate` + `requireRole` middleware.
- **Nginx** — reverse proxy с HTTPS, HSTS, пробросом `X-Forwarded-*`.
- **Prometheus + Grafana** через provisioning (datasources и dashboards из файлов).
- **Структурированные JSON-логи** с `requestId`.
- **Graceful shutdown** по SIGTERM.
- **Multi-stage Dockerfile** + non-root user.

---

## Ограничения

- **Refresh-токены не отзываются** (stateless JWT). Для отзыва нужно хранить
  их в БД с флагом `revoked`.
- **Rate limit — в памяти** процесса. При горизонтальном масштабировании
  нужен Redis.
- **Самоподписанный сертификат** — только для разработки. В продакшене
  Let's Encrypt / DigiCert.

---

## Откат миграций и восстановление окружения

См. раздел [Откат миграций](#откат-миграций).

Полное восстановление окружения:

```bash
docker compose down -v          # удалить контейнеры + volumes (данные)
docker compose up -d --build    # заново
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
```