# 🚀 БЫСТРЫЕ КОМАНДЫ

## 🚨 КРИТИЧЕСКАЯ СИТУАЦИЯ
```bash
# 1. НЕМЕДЛЕННАЯ ОЧИСТКА
./cleanup-malware.sh

# 2. ПЕРЕЗАГРУЗКА (ОБЯЗАТЕЛЬНО!)
sudo reboot
```

## 🔒 ВАРИАНТЫ ЗАПУСКА ПОСЛЕ ОЧИСТКИ

### HTTP режим (временно)
```bash
./run-http-only.sh
# Сайт: http://trc.works
```

### Тест SSL (staging)
```bash
./test-ssl-staging.sh
# Проверка работы SSL без rate limit
```

### Настоящий SSL (после 11:19 UTC)
```bash
./get-ssl-cert-fixed.sh
# Получение рабочего SSL сертификата
```

## 🛡️ ПРОВЕРКА БЕЗОПАСНОСТИ
```bash
# Проверка на malware
ps aux | grep -E "(kinsing|xmrig|minergate)"
netstat -tulpn | grep -E "(4444|8080|3333)"

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Настройка firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 📊 ПРОВЕРКА СТАТУСА
```bash
# Статус контейнеров
docker compose ps

# Логи nginx
docker compose logs nginx

# Проверка сертификатов
ls -la certbot/conf/live/trc.works/

# Тест сайта
curl -I http://trc.works
```

## 🛑 УПРАВЛЕНИЕ
```bash
# Остановка
docker compose down

# Запуск
docker compose up -d

# Пересборка
docker compose build --no-cache
```

---
**⚠️ ВНИМАНИЕ:** Сначала выполните план из `EMERGENCY_RECOVERY_PLAN.md`! 