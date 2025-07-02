# Настройка HTTPS для trc.works

## 🚀 Быстрый старт

### 1. Настройка DNS
Убедитесь, что ваши домены указывают на IP сервера:
- `trc.works` → IP вашего сервера
- `www.trc.works` → IP вашего сервера

Проверить можно командой:
```bash
dig +short trc.works
dig +short www.trc.works
```

### 2. Получение SSL сертификата
Запустите скрипт для автоматической настройки HTTPS:
```bash
./get-ssl-cert.sh
```

Скрипт выполнит следующие действия:
1. Создаст необходимые директории для certbot
2. Проверит DNS настройки
3. Запросит ваш email для Let's Encrypt
4. Временно запустит приложение в HTTP режиме
5. Получит SSL сертификат от Let's Encrypt
6. Переключит приложение в HTTPS режим

### 3. Проверка работы
После успешного выполнения скрипта ваше приложение будет доступно по адресам:
- https://trc.works
- https://www.trc.works

HTTP запросы будут автоматически перенаправляться на HTTPS.

## 🔄 Автоматическое обновление сертификата

SSL сертификаты Let's Encrypt действуют 90 дней. Для автоматического обновления:

### Настройка cron
Добавьте задачу в crontab для обновления сертификата каждые 2 месяца:
```bash
crontab -e
```

Добавьте строку:
```
0 0 1 */2 * /bin/bash /path/to/your/project/renew-ssl-cert.sh
```

### Ручное обновление
Можно также обновить сертификат вручную:
```bash
./renew-ssl-cert.sh
```

## 🔒 Настройки безопасности

В конфигурации nginx включены следующие заголовки безопасности:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy: strict-origin-when-cross-origin`

## 📋 Структура файлов

```
project/
├── docker-compose.yml          # Обновлен для поддержки HTTPS
├── nginx/
│   ├── nginx.conf             # Основная конфигурация с HTTPS
│   └── nginx-temp.conf        # Временная HTTP конфигурация
├── certbot/
│   ├── conf/                  # SSL сертификаты
│   └── www/                   # Временные файлы для валидации
├── get-ssl-cert.sh            # Скрипт настройки SSL
└── renew-ssl-cert.sh          # Скрипт обновления SSL
```

## 🛠️ Устранение неполадок

### Ошибка получения сертификата
1. Убедитесь, что домены указывают на ваш сервер
2. Проверьте, что порт 80 открыт и доступен из интернета
3. Убедитесь, что nginx запущен и отвечает на HTTP запросы

### Проверка статуса nginx
```bash
docker-compose logs nginx
```

### Проверка статуса certbot
```bash
docker-compose logs certbot
```

### Проверка сертификата
```bash
openssl x509 -in ./certbot/conf/live/trc.works/fullchain.pem -text -noout
```

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи сервисов
2. Убедитесь в правильности DNS настроек
3. Проверьте, что все порты (80, 443) открыты в файрволе

## 🔄 Откат изменений

Если нужно вернуться к HTTP:
1. Остановите docker-compose: `docker-compose down`
2. Восстановите старую конфигурацию nginx
3. Удалите HTTPS порт из docker-compose.yml
4. Запустите: `docker-compose up -d` 