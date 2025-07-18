# RabbitMQ Configuration

Этот каталог содержит конфигурационные файлы для RabbitMQ.

## Файлы

### `rabbitmq.conf`
Основной конфигурационный файл RabbitMQ в новом формате. Содержит:
- Сетевые настройки
- Управление памятью
- Настройки производительности
- Конфигурация логирования
- Настройки очередей
- TCP параметры

### `rabbitmq.env`
Файл с переменными окружения для гибкой настройки RabbitMQ:
- Учетные данные по умолчанию
- Лимиты памяти и диска
- Настройки кластеризации
- Порты и плагины

## Доступ к управлению

После запуска RabbitMQ доступен по адресам:
- **AMQP порт**: `localhost:5672`
- **Management UI**: `http://localhost:15672`

### Учетные данные по умолчанию:
- **Username**: `guest`
- **Password**: `guest`

## Настройка в Docker Compose

RabbitMQ настроен в `docker-compose.yml` со следующими особенностями:
- Монтирование конфигурационного файла
- Использование переменных окружения из файла
- Persistent storage для данных
- Health check для мониторинга состояния

## Изменение конфигурации

1. **Базовые настройки**: Измените переменные в `rabbitmq.env`
2. **Расширенные настройки**: Отредактируйте `rabbitmq.conf`
3. **Перезапуск**: Выполните `docker-compose restart rabbitmq`

## Мониторинг

- Web UI: `http://localhost:15672`
- Логи: `docker-compose logs rabbitmq`
- Статус: `docker-compose ps rabbitmq`

## Производительность

Конфигурация оптимизирована для:
- Умеренной нагрузки
- Эффективного использования памяти
- Стабильной работы в контейнере
- Легкого масштабирования 