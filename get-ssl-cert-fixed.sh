#!/bin/bash

# Исправленный скрипт для получения SSL сертификата для домена trc.works

echo "🔐 Настройка SSL сертификата для trc.works..."

# Создаем необходимые директории
mkdir -p certs
mkdir -p certbot/www

# Проверяем, что домен указывает на этот сервер
echo "📡 Проверяем DNS настройки домена..."
echo "trc.works: $(dig +short trc.works)"
echo "www.trc.works: $(dig +short www.trc.works)"

echo ""
echo "⚠️  ВАЖНО: Убедитесь, что домены trc.works и www.trc.works указывают на IP этого сервера!"
echo ""

# Запрашиваем email для Let's Encrypt
read -p "📧 Введите ваш email адрес для Let's Encrypt: " email

if [ -z "$email" ]; then
    echo "❌ Email не может быть пустым!"
    exit 1
fi

# Проверяем предыдущие попытки получения сертификата
echo "🔍 Проверяем предыдущие попытки получения сертификата..."
if [ -f ".ssl_attempt_timestamp" ]; then
    last_attempt=$(cat .ssl_attempt_timestamp)
    current_time=$(date +%s)
    time_diff=$((current_time - last_attempt))
    
    # Let's Encrypt rate limit: 5 неудачных попыток в час
    if [ $time_diff -lt 3600 ]; then
        echo "⏰ Последняя попытка была $(($time_diff / 60)) минут назад"
        echo "   Рекомендуется подождать $((60 - time_diff / 60)) минут до повторной попытки"
        read -p "❓ Продолжить несмотря на возможный rate limit? (y/N): " continue_anyway
        if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
            echo "⏸️  Прерываем выполнение. Запустите скрипт позже."
            exit 1
        fi
    fi
fi

# Сохраняем временную метку попытки
echo $(date +%s) > .ssl_attempt_timestamp

# Устанавливаем переменную окружения для docker-compose
export LETSENCRYPT_EMAIL="$email"

echo "🧹 Очищаем старые данные..."
rm -rf certbot/conf/*
rm -rf certbot/www/*

echo "🚀 Настраиваем временную HTTP конфигурацию nginx..."

# Создаем резервную копию основной конфигурации
cp nginx/nginx.conf nginx/nginx.conf.backup

# Создаем простую HTTP-only конфигурацию
cat > nginx/nginx-simple.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    client_max_body_size 100M;

    server {
        listen 80;
        server_name trc.works www.trc.works;
        
        # Let's Encrypt validation
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Test page
        location / {
            return 200 'TRC.works - SSL setup in progress...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Используем простую конфигурацию
cp nginx/nginx-simple.conf nginx/nginx.conf

echo "🚀 Запускаем nginx с простой HTTP конфигурацией..."

# Запускаем только nginx, frontend и backend для тестирования
docker compose up -d nginx frontend backend

echo "⏳ Ждем 15 секунд для запуска nginx..."
sleep 15

echo "🔍 Проверяем работу nginx..."
curl -s http://localhost/health || echo "Health check failed"

echo "📜 Получаем SSL сертификат..."
docker compose run --rm certbot

if [ $? -eq 0 ]; then
    echo "✅ SSL сертификат успешно получен!"
    
    echo "🔄 Восстанавливаем полную конфигурацию nginx с HTTPS..."
    # Восстанавливаем основную конфигурацию с HTTPS
    cp nginx/nginx.conf.backup nginx/nginx.conf
    
    echo "🔄 Перезапускаем nginx с SSL поддержкой..."
    docker compose restart nginx
    
    echo "🚀 Запускаем все остальные сервисы..."
    docker compose up -d
    
    echo ""
    echo "🎉 HTTPS настроен! Ваш сайт доступен по адресу:"
    echo "   https://trc.works"
    echo "   https://www.trc.works"
    echo ""
    echo "📋 Для автоматического обновления сертификата добавьте в crontab:"
    echo "   0 0 1 */2 * /bin/bash $PWD/renew-ssl-cert.sh"
    echo ""
    echo "🧹 Удаляем временные файлы..."
    rm -f nginx/nginx-simple.conf
    rm -f .ssl_attempt_timestamp
else
    echo "❌ Ошибка при получении SSL сертификата!"
    echo "   Возможные причины:"
    echo "   - Rate limiting (нужно подождать)"
    echo "   - Домен не указывает на этот сервер"
    echo "   - Порт 80 закрыт"
    echo "   - Проблемы с DNS"
    
    # Восстанавливаем оригинальную конфигурацию в случае ошибки
    if [ -f nginx/nginx.conf.backup ]; then
        cp nginx/nginx.conf.backup nginx/nginx.conf
        docker compose restart nginx
    fi
    
    echo "🧹 Очищаем временные файлы..."
    rm -f nginx/nginx-simple.conf
    exit 1
fi 