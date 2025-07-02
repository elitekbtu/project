#!/bin/bash

# Скрипт для тестирования SSL через staging сервер Let's Encrypt

echo "🧪 Тестирование SSL через staging сервер Let's Encrypt..."
echo "   (staging сертификаты не будут работать в браузере, но позволят протестировать процесс)"

# Создаем необходимые директории
mkdir -p certbot/conf
mkdir -p certbot/www

# Проверяем DNS
echo "📡 Проверяем DNS настройки:"
echo "trc.works: $(dig +short trc.works)"
echo "www.trc.works: $(dig +short www.trc.works)"

# Запрашиваем email
read -p "📧 Введите email: " email
if [ -z "$email" ]; then
    echo "❌ Email обязателен!"
    exit 1
fi

# Создаем простую nginx конфигурацию
echo "🔧 Настраиваем nginx..."
cat > nginx/nginx-test.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name trc.works www.trc.works;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'SSL Test - OK';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Сохраняем оригинальную конфигурацию
cp nginx/nginx.conf nginx/nginx.conf.original 2>/dev/null || true
cp nginx/nginx-test.conf nginx/nginx.conf

# Запускаем nginx
echo "🚀 Запускаем nginx..."
docker compose up -d nginx

sleep 10

# Тестируем staging сертификат
echo "🧪 Получаем staging сертификат..."
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot:latest \
  certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$email" \
  --agree-tos \
  --no-eff-email \
  --staging \
  -d trc.works \
  -d www.trc.works

if [ $? -eq 0 ]; then
    echo "✅ Staging сертификат получен успешно!"
    echo "📋 Файлы сертификата:"
    ls -la certbot/conf/live/trc.works/ 2>/dev/null || echo "Файлы не найдены"
    
    echo ""
    echo "🎯 Процесс работает! Теперь можно получить настоящий сертификат:"
    echo "   1. Подождите окончания rate limit (примерно час)"
    echo "   2. Запустите: ./get-ssl-cert-fixed.sh"
    echo "   3. Или используйте этот скрипт без --staging флага"
else
    echo "❌ Ошибка получения staging сертификата!"
    echo "   Проверьте:"
    echo "   - DNS настройки"
    echo "   - Доступность порта 80"
    echo "   - Работу nginx"
fi

# Восстанавливаем оригинальную конфигурацию
if [ -f nginx/nginx.conf.original ]; then
    cp nginx/nginx.conf.original nginx/nginx.conf
fi

echo "🛑 Останавливаем тестовые контейнеры..."
docker compose down 