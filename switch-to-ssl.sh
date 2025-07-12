#!/bin/bash

# Скрипт для переключения на SSL конфигурацию
echo "Переключаем nginx на SSL конфигурацию..."

# Копируем SSL конфигурацию
cp nginx/nginx.conf.with-ssl nginx/nginx.conf

# Перезапускаем nginx контейнер
docker compose restart nginx

echo "Nginx переключен на SSL конфигурацию!"
echo "Убедитесь, что SSL сертификаты установлены в ./certbot/conf/"
echo "Для проверки статуса используйте: docker compose logs nginx" 