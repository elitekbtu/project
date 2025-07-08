#!/bin/bash

# 🧪 Скрипт тестирования системы виртуальной примерки через Docker Compose

echo "🧪 Тестирование системы виртуальной примерки через Docker Compose"
echo "================================================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка зависимостей
log "Проверка зависимостей..."

if ! command -v docker &> /dev/null; then
    error "Docker не установлен!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose не установлен!"
    exit 1
fi

success "Docker и Docker Compose установлены"

# Использование тестового .env файла
if [ ! -f "docker-test.env" ]; then
    error "Файл docker-test.env не найден!"
    exit 1
fi

log "Копирование тестового .env файла..."
cp docker-test.env .env
success ".env файл подготовлен"

# Остановка существующих контейнеров
log "Остановка существующих контейнеров..."
docker-compose down -v --remove-orphans 2>/dev/null || docker compose down -v --remove-orphans 2>/dev/null

# Очистка old images и volumes для чистого тестирования
log "Очистка Docker ресурсов..."
docker system prune -f

# Функция для проверки статуса сервиса
check_service() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    log "Проверка статуса сервиса $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service_name 2>/dev/null | grep -q "Up" || docker compose ps $service_name 2>/dev/null | grep -q "running"; then
            success "Сервис $service_name запущен"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    error "Сервис $service_name не запустился за $((max_attempts * 2)) секунд"
    return 1
}

# Функция для проверки здоровья API
check_api_health() {
    local max_attempts=30
    local attempt=1
    
    log "Проверка здоровья API..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:8000/api/health >/dev/null 2>&1; then
            success "API здоров и отвечает"
            return 0
        fi
        
        echo -n "."
        sleep 3
        ((attempt++))
    done
    
    error "API не отвечает за $((max_attempts * 3)) секунд"
    return 1
}

# Сборка и запуск контейнеров
log "Сборка и запуск контейнеров..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    docker compose up -d --build
fi

if [ $? -ne 0 ]; then
    error "Ошибка при запуске Docker Compose"
    exit 1
fi

success "Docker Compose запущен"

# Проверка критических сервисов
log "Проверка критических сервисов..."

# Проверяем базу данных
check_service "db"
if [ $? -ne 0 ]; then
    error "База данных не запустилась"
    docker-compose logs db 2>/dev/null || docker compose logs db
    exit 1
fi

# Проверяем Redis
check_service "redis"
if [ $? -ne 0 ]; then
    warning "Redis не запустился, но продолжаем тестирование"
fi

# Проверяем RabbitMQ
check_service "rabbitmq"
if [ $? -ne 0 ]; then
    warning "RabbitMQ не запустился, но продолжаем тестирование"
fi

# Даем время на миграции
log "Ожидание завершения миграций..."
sleep 10

# Проверяем backend
check_service "backend"
if [ $? -ne 0 ]; then
    error "Backend не запустился"
    echo "Логи backend:"
    docker-compose logs backend 2>/dev/null || docker compose logs backend
    exit 1
fi

# Проверяем здоровье API
check_api_health
if [ $? -ne 0 ]; then
    error "API не прошел проверку здоровья"
    echo "Логи backend:"
    docker-compose logs backend 2>/dev/null || docker compose logs backend
    exit 1
fi

# Проверяем frontend
check_service "frontend"
if [ $? -ne 0 ]; then
    warning "Frontend не запустился"
    echo "Логи frontend:"
    docker-compose logs frontend 2>/dev/null || docker compose logs frontend
fi

# Тестирование API endpoints
log "Тестирование API endpoints..."

# Тест health endpoint
if curl -f -s http://localhost:8000/api/health | grep -q "healthy"; then
    success "Health endpoint работает"
else
    error "Health endpoint не работает"
fi

# Тест API docs
if curl -f -s http://localhost:8000/docs >/dev/null 2>&1; then
    success "API документация доступна"
else
    warning "API документация недоступна"
fi

# Проверка структуры директорий uploads
log "Проверка структуры uploads..."
if command -v docker-compose &> /dev/null; then
    docker-compose exec -T backend ls -la uploads/ 2>/dev/null
else
    docker compose exec -T backend ls -la uploads/ 2>/dev/null
fi

# Выводим информацию о запущенных сервисах
log "Информация о запущенных сервисах:"
if command -v docker-compose &> /dev/null; then
    docker-compose ps
else
    docker compose ps
fi

echo ""
success "🎉 Тестирование Docker Compose завершено!"
echo ""
echo "📊 Результаты тестирования:"
echo "  🌐 Frontend: http://localhost (через nginx)"
echo "  🔧 Backend API: http://localhost:8000"
echo "  📚 API Docs: http://localhost:8000/docs"
echo "  🗄️  Database: localhost:5432"
echo "  🐰 RabbitMQ Management: http://localhost:15672 (guest/guest)"
echo ""
echo "💡 Для тестирования виртуальной примерки:"
echo "  1. Перейдите на http://localhost"
echo "  2. Создайте аккаунт или войдите"
echo "  3. Перейдите в 'Создать образ'"
echo "  4. Переключитесь на 'Виртуальная примерка'"
echo "  5. Загрузите свое фото и добавьте элементы одежды"
echo ""
echo "🔄 Для остановки: docker-compose down -v"
echo "📋 Для просмотра логов: docker-compose logs [service_name]"

# Cleanup функция при завершении
cleanup() {
    log "Очистка тестовых файлов..."
    rm -f .env
    success "Cleanup завершен"
}

# Регистрируем cleanup функцию
trap cleanup EXIT 