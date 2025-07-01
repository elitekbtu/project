FROM node:20-alpine AS builder
WORKDIR /app

# Устанавливаем зависимости --omit=dev
COPY package*.json ./
RUN npm install 

# Копируем исходники и собираем приложение
COPY . .
RUN npm run build

# Expose default preview port
EXPOSE 80

# Start lightweight production server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "80"]
