#!/bin/bash

# Скрипт для переключения на HTTP конфигурацию
echo "Переключаем nginx на HTTP конфигурацию..."

# Восстанавливаем HTTP конфигурацию (уже есть в nginx.conf)
# Просто перезапускаем nginx контейнер
docker compose restart nginx

echo "Nginx переключен на HTTP конфигурацию!"
echo "Для проверки статуса используйте: docker compose logs nginx" 