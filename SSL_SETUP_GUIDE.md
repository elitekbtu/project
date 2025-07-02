# 🔐 Руководство по настройке SSL для trc.works

## Обзор скриптов

### 📋 Основные скрипты:

1. **`get-ssl-cert-fixed.sh`** - Улучшенный скрипт получения SSL сертификата
2. **`get-ssl-cert.sh`** - Оригинальный скрипт получения SSL сертификата  
3. **`test-ssl-staging.sh`** - Тестирование через staging сервер Let's Encrypt
4. **`renew-ssl-cert.sh`** - Автоматическое обновление сертификата
5. **`check-ssl-status.sh`** - Проверка статуса SSL сертификата

## 🚀 Быстрый старт

### 1. Первое получение SSL сертификата:

```bash
# Проверьте DNS настройки перед запуском
dig +short trc.works
dig +short www.trc.works

# Запустите основной скрипт
./get-ssl-cert-fixed.sh
```

### 2. Тестирование (рекомендуется перед production):

```bash
# Сначала протестируйте через staging
./test-ssl-staging.sh
```

### 3. Проверка статуса:

```bash
# Проверьте статус сертификата и сервисов
./check-ssl-status.sh
```

## 🔧 Детали конфигурации

### Docker Compose
- Используется переменная окружения `LETSENCRYPT_EMAIL`
- Автоматическое монтирование сертификатов в nginx

### Nginx
- HTTP → HTTPS редирект
- Современные SSL протоколы (TLSv1.2, TLSv1.3)
- Security headers (HSTS, X-Frame-Options, etc.)
- WebSocket поддержка

## ⚠️ Важные моменты

### Rate Limiting
- Let's Encrypt лимитирует: 5 неудачных попыток в час
- Скрипт автоматически отслеживает попытки
- Используйте staging для тестирования

### DNS требования
- `trc.works` должен указывать на ваш сервер
- `www.trc.works` должен указывать на ваш сервер
- Порт 80 должен быть открыт для валидации

### Автоматическое обновление
Добавьте в crontab для автоматического обновления:
```bash
# Проверка каждые 2 месяца в 00:00 1 числа
0 0 1 */2 * /bin/bash /путь/к/проекту/renew-ssl-cert.sh

# Или еженедельная проверка статуса
0 9 * * 1 /bin/bash /путь/к/проекту/check-ssl-status.sh
```

## 🐛 Решение проблем

### Сертификат не получается
1. Проверьте DNS: `dig +short trc.works`
2. Проверьте доступность порта 80
3. Убедитесь в отсутствии rate limiting
4. Используйте staging для тестирования

### HTTPS не работает
1. Проверьте статус: `./check-ssl-status.sh`
2. Проверьте nginx конфигурацию: `docker compose exec nginx nginx -t`
3. Перезапустите nginx: `docker compose restart nginx`

### Сертификат скоро истекает
```bash
# Принудительное обновление
./renew-ssl-cert.sh

# Если не помогает, получите новый
./get-ssl-cert-fixed.sh
```

## 📁 Структура файлов

```
├── get-ssl-cert-fixed.sh      # Основной скрипт
├── get-ssl-cert.sh           # Оригинальный скрипт
├── test-ssl-staging.sh       # Staging тестирование
├── renew-ssl-cert.sh         # Автообновление
├── check-ssl-status.sh       # Проверка статуса
├── docker-compose.yml        # Docker конфигурация
├── nginx/
│   └── nginx.conf           # Nginx конфигурация
└── certbot/
    ├── conf/               # SSL сертификаты
    └── www/                # Temporary файлы для валидации
```

## 🔍 Мониторинг

Регулярно запускайте:
```bash
./check-ssl-status.sh
```

Этот скрипт проверит:
- Срок действия сертификата
- Доступность HTTPS
- Корректность nginx конфигурации
- Статус Docker контейнеров 