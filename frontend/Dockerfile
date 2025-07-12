FROM node:22-alpine AS builder
WORKDIR /app

# Устанавливаем зависимости --omit=dev
COPY package*.json ./
RUN npm install 

# Копируем исходники и собираем приложение
COPY . .
RUN npm run build
