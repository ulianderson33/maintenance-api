# Нагрузочное тестирование (k6)

## Требования

- [k6](https://k6.io/docs/get-started/installation/) (v0.5x или новее)
- Запущенный стек: `docker compose up -d`
- Пользователь в БД: `admin@test.com` / `admin12345`

## Запуск

```bash
k6 run --insecure-skip-tls-verify load-tests/api.js