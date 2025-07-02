#!/bin/bash

echo "🌐 Запуск приложения в HTTP режиме (без SSL)"
echo "   Используйте пока ждете окончания rate limit для SSL"

# Создаем простую HTTP конфигурацию nginx
echo "🔧 Настраиваем nginx для HTTP..."

# Сохраняем оригинальную конфигурацию
cp nginx/nginx.conf nginx/nginx.conf.with-ssl 2>/dev/null || true

# Создаем HTTP-only конфигурацию
cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    client_max_body_size 100M;
    resolver 127.0.0.11 valid=30s;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    upstream frontend {
        server frontend:80;
    }

    upstream backend {
        server backend:8000;
    }

    server {
        listen 80;
        server_name trc.works www.trc.works;

        # Security headers (базовые, без HSTS)
        add_header X-Content-Type-Options "nosniff";
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";

        # Let's Encrypt validation (на случай если понадобится)
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Frontend proxy
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_request_buffering off;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Static files/uploads
        location /uploads/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location = /health {
            access_log off;
            add_header Content-Type text/plain;
            return 200 'healthy - HTTP mode';
        }

        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
EOF

echo "🚀 Запускаем приложение в HTTP режиме..."

# Создаем директории для certbot на случай
mkdir -p certbot/conf certbot/www

# Запускаем все сервисы кроме certbot
docker compose up -d nginx frontend backend db redis rabbitmq

echo "⏳ Ждем запуска сервисов..."
sleep 15

echo "🔍 Проверяем статус сервисов..."
docker compose ps

echo ""
echo "✅ Приложение запущено в HTTP режиме!"
echo ""
echo "🌐 Доступно по адресам:"
echo "   http://trc.works"
echo "   http://www.trc.works"
echo ""
echo "⚠️  ВНИМАНИЕ: Сайт работает без SSL шифрования!"
echo ""
echo "📋 Когда будете готовы настроить HTTPS:"
echo "   1. Дождитесь окончания rate limit Let's Encrypt"
echo "   2. Запустите: ./get-ssl-cert-fixed.sh"
echo "   3. Или протестируйте: ./test-ssl-staging.sh"
echo ""
echo "🛑 Для остановки: docker compose down" 