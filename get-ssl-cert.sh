#!/bin/bash

# Скрипт для получения SSL сертификата для домена trc.works

echo "🔐 Настройка SSL сертификата для trc.works..."

# Создаем необходимые директории
mkdir -p certbot/conf
mkdir -p certbot/www

# Проверяем, что домен указывает на этот сервер
echo "📡 Проверяем DNS настройки домена..."
dig +short trc.works
dig +short www.trc.works

echo ""
echo "⚠️  ВАЖНО: Убедитесь, что домены trc.works и www.trc.works указывают на IP этого сервера!"
echo ""

# Запрашиваем email для Let's Encrypt
read -p "📧 Введите ваш email адрес для Let's Encrypt: " email

if [ -z "$email" ]; then
    echo "❌ Email не может быть пустым!"
    exit 1
fi

# Обновляем docker-compose.yml с правильным email
sed -i "s/your-email@example.com/$email/g" docker-compose.yml

echo "🚀 Настраиваем временную HTTP конфигурацию nginx..."

# Создаем резервную копию основной конфигурации
cp nginx/nginx.conf nginx/nginx.conf.backup

# Создаем временную HTTP-only конфигурацию
cat > nginx/nginx-temp.conf << 'EOF'
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
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        add_header X-Content-Type-Options "nosniff";
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
        }

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

        location /uploads/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location = /health {
            access_log off;
            add_header Content-Type text/plain;
            return 200 'healthy';
        }

        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
EOF

# Используем временную конфигурацию
cp nginx/nginx-temp.conf nginx/nginx.conf

echo "🚀 Запускаем nginx с HTTP для получения сертификата..."

# Запускаем все сервисы
docker compose up -d

echo "⏳ Ждем 10 секунд для запуска nginx..."
sleep 10

echo "📜 Получаем SSL сертификат..."
docker compose run --rm certbot

if [ $? -eq 0 ]; then
    echo "✅ SSL сертификат успешно получен!"
    
    echo "🔄 Восстанавливаем полную конфигурацию nginx с HTTPS..."
    # Восстанавливаем основную конфигурацию с HTTPS
    cp nginx/nginx.conf.backup nginx/nginx.conf
    
    echo "🔄 Перезапускаем nginx с SSL поддержкой..."
    docker compose restart nginx
    
    echo ""
    echo "🎉 HTTPS настроен! Ваш сайт доступен по адресу:"
    echo "   https://trc.works"
    echo "   https://www.trc.works"
    echo ""
    echo "📋 Для автоматического обновления сертификата добавьте в crontab:"
    echo "   0 0 1 */2 * /bin/bash $PWD/renew-ssl-cert.sh"
    echo ""
    echo "🧹 Удаляем временные файлы..."
    rm -f nginx/nginx-temp.conf
else
    echo "❌ Ошибка при получении SSL сертификата!"
    echo "   Проверьте, что домен указывает на этот сервер"
    echo "   и что порт 80 открыт"
    
    # Восстанавливаем оригинальную конфигурацию в случае ошибки
    if [ -f nginx/nginx.conf.backup ]; then
        cp nginx/nginx.conf.backup nginx/nginx.conf
        docker compose restart nginx
    fi
    exit 1
fi 