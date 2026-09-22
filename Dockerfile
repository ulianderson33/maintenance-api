# ---------- Stage 1: build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Сначала копируем только package-файлы — так Docker кэширует слой с зависимостями
COPY package*.json ./

# Устанавливаем ТОЛЬКО production-зависимости
RUN npm ci --omit=dev

# Копируем исходники
COPY src ./src

# ---------- Stage 2: runtime ----------
FROM node:20-alpine

WORKDIR /app

# Создаём непривилегированного пользователя
RUN addgroup -S app && adduser -S app -G app

# Копируем node_modules из build-стадии
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY package*.json ./

# Даём права пользователю app
RUN chown -R app:app /app
USER app

# Папка для JSON-хранилища (можно монтировать томом)
RUN mkdir -p /app/data

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]