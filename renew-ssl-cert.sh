#!/bin/bash

# Скрипт для автоматического обновления SSL сертификата

echo "🔄 Проверяем и обновляем SSL сертификат..."

cd "$(dirname "$0")"

# Обновляем сертификат
docker-compose run --rm certbot renew

# Если сертификат был обновлен, перезапускаем nginx
if [ $? -eq 0 ]; then
    echo "🔄 Перезапускаем nginx..."
    docker-compose restart nginx
    echo "✅ SSL сертификат обновлен!"
else
    echo "ℹ️  Сертификат не требует обновления"
fi 