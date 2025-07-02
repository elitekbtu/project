#!/bin/bash

# Скрипт для проверки статуса SSL сертификата

echo "🔐 Проверка статуса SSL сертификата для trc.works..."

# Проверяем существование сертификата
if [ -f "certbot/conf/live/trc.works/fullchain.pem" ]; then
    echo "✅ SSL сертификат найден"
    
    # Проверяем срок действия
    cert_expiry=$(openssl x509 -enddate -noout -in certbot/conf/live/trc.works/fullchain.pem | cut -d= -f2)
    cert_expiry_timestamp=$(date -d "$cert_expiry" +%s)
    current_timestamp=$(date +%s)
    days_left=$(( (cert_expiry_timestamp - current_timestamp) / 86400 ))
    
    echo "📅 Сертификат действителен до: $cert_expiry"
    echo "⏰ Осталось дней: $days_left"
    
    if [ $days_left -lt 30 ]; then
        echo "⚠️  ВНИМАНИЕ: Сертификат истекает менее чем через 30 дней!"
        echo "   Рекомендуется обновить сертификат: ./renew-ssl-cert.sh"
    elif [ $days_left -lt 7 ]; then
        echo "🚨 КРИТИЧНО: Сертификат истекает менее чем через 7 дней!"
        echo "   НЕОБХОДИМО срочно обновить сертификат!"
    else
        echo "✅ Сертификат в порядке"
    fi
    
    # Проверяем доступность HTTPS
    echo ""
    echo "🌐 Проверяем доступность HTTPS..."
    
    if curl -s -f -m 10 https://trc.works/health > /dev/null 2>&1; then
        echo "✅ HTTPS работает корректно"
    else
        echo "❌ HTTPS недоступен или работает неправильно"
        
        # Проверяем HTTP
        if curl -s -f -m 10 http://trc.works/health > /dev/null 2>&1; then
            echo "ℹ️  HTTP доступен (возможно, проблема с SSL конфигурацией)"
        else
            echo "❌ HTTP также недоступен (проблема с nginx или сервисами)"
        fi
    fi
    
    # Проверяем nginx конфигурацию
    echo ""
    echo "🔧 Проверяем конфигурацию nginx..."
    if docker compose exec nginx nginx -t > /dev/null 2>&1; then
        echo "✅ Конфигурация nginx корректна"
    else
        echo "❌ Ошибка в конфигурации nginx"
        docker compose exec nginx nginx -t
    fi
    
else
    echo "❌ SSL сертификат не найден"
    echo "   Запустите скрипт получения сертификата:"
    echo "   ./get-ssl-cert-fixed.sh"
fi

# Проверяем статус контейнеров
echo ""
echo "📦 Статус контейнеров:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 