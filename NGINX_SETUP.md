# Настройка Nginx для HTTP и HTTPS

## Обзор

В проекте есть две конфигурации nginx:
- `nginx/nginx.conf` - HTTP режим (для разработки и тестирования)
- `nginx/nginx.conf.with-ssl` - HTTPS режим (для продакшена)

## Структура

```
nginx/
├── nginx.conf           # HTTP конфигурация (по умолчанию)
├── nginx.conf.with-ssl  # HTTPS конфигурация
└── Dockerfile          # Docker образ nginx
```

## Режимы работы

### HTTP режим (по умолчанию)
- Слушает на порту 80
- Обслуживает статические файлы frontend напрямую
- Проксирует API запросы к backend
- Подходит для разработки и тестирования

### HTTPS режим (продакшен)
- Слушает на портах 80 (редирект) и 443 (HTTPS)
- SSL сертификаты Let's Encrypt
- Все HTTP запросы редиректятся на HTTPS
- Улучшенные security headers
- Gzip сжатие

## Переключение режимов

### Переключение на HTTPS
```bash
./switch-to-ssl.sh
```

### Переключение на HTTP
```bash
./switch-to-http.sh
```

## Требования для HTTPS

1. **SSL сертификаты**: Должны быть установлены в `./certbot/conf/`
2. **Домен**: Настроен на `trc.works` и `www.trc.works`
3. **Порты**: 80 и 443 должны быть открыты

## Получение SSL сертификатов

Используйте существующие скрипты:
- `get-ssl-cert.sh` - получение сертификатов
- `renew-ssl-cert.sh` - обновление сертификатов

## Проверка статуса

```bash
# Логи nginx
docker compose logs nginx

# Проверка конфигурации
docker compose exec nginx nginx -t

# Статус контейнеров
docker compose ps
```

## Особенности конфигурации

### Frontend
- Статические файлы обслуживаются из `/usr/share/nginx/html`
- SPA routing с `try_files $uri $uri/ /index.html`
- Кэширование статических ресурсов
- Отключение кэша для HTML файлов

### Backend API
- Проксирование на `backend:8000`
- Поддержка больших файлов (до 100MB)
- Увеличенные таймауты для API запросов
- WebSocket поддержка

### Security
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- HSTS для HTTPS
- SSL/TLS настройки
- Rate limiting (через backend)

## Troubleshooting

### 404 ошибки
1. Проверьте, что frontend собран: `docker compose logs frontend`
2. Проверьте volume: `docker compose exec nginx ls -la /usr/share/nginx/html`
3. Пересоберите frontend: `docker compose up --build frontend`

### SSL ошибки
1. Проверьте наличие сертификатов: `ls -la ./certbot/conf/live/trc.works/`
2. Проверьте права доступа к сертификатам
3. Проверьте конфигурацию nginx: `docker compose exec nginx nginx -t`

### Проблемы с проксированием
1. Проверьте, что backend запущен: `docker compose ps backend`
2. Проверьте логи backend: `docker compose logs backend`
3. Проверьте сетевую связность между контейнерами 