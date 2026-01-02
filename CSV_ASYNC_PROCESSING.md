# Асинхронная обработка массового сокращения ссылок

## Обзор

Реализована полностью асинхронная система обработки CSV файлов для массового сокращения ссылок с использованием Bull Queue и Redis.

## Архитектура

### Backend

#### 1. MongoDB модель (`packages/server/src/model/csv-shorten-job.model.ts`)
- Хранит информацию о задачах обработки
- Статусы: `pending`, `processing`, `completed`, `failed`, `cancelled`
- Автоматическое удаление через 24 часа (TTL index)

#### 2. Bull Queue (`packages/server/src/queue/csv-shorten.queue.ts`)
- Обрабатывает CSV файлы асинхронно
- Батчинг по 50 ссылок одновременно
- Retry логика с экспоненциальной задержкой (3 попытки)
- Обновление прогресса в реальном времени
- Поддержка отмены задач

#### 3. API Controller (`packages/server/src/controller/csv-shorten.controller.ts`)
Endpoints:
- `POST /api/csv-shorten-job` - создание задачи (загрузка CSV)
- `GET /api/csv-shorten-job/:jobId/status` - получение статуса
- `GET /api/csv-shorten-job/:jobId/download` - скачивание результата
- `POST /api/csv-shorten-job/:jobId/cancel` - отмена задачи

### Frontend

#### Обновленный компонент (`packages/webapp/src/pages/form/Share/GenerateLinkModal.tsx`)
- Загрузка CSV через FormData
- Polling статуса каждые 3 секунды
- Прогресс-бар с отображением обработанных строк
- Уведомления о завершении/ошибках
- Кнопка отмены задачи
- Автоматическое скачивание готового файла

## Особенности

### Производительность
- **Параллельная обработка**: до 50 ссылок одновременно
- **Retry механизм**: 3 попытки с задержкой 2s, 4s, 8s
- **Батчинг**: обработка большими блоками с паузами между ними
- **Масштабируемость**: Bull Queue + Redis могут обрабатывать тысячи задач

### UX
- **Неблокирующий интерфейс**: пользователь может продолжать работу
- **Прогресс в реальном времени**: видимость обработки
- **Уведомления**: информирование о завершении
- **Возможность отмены**: контроль над длительными операциями

### Безопасность
- **Проверка прав доступа**: только владелец может получить доступ к задаче
- **Ограничение размера файла**: максимум 10MB
- **Валидация формата**: только CSV файлы
- **Автоочистка**: файлы удаляются через 24 часа

## Формат CSV

### Входной файл
```csv
id,firstname,lastname
1,Jack,Silver
2,Nikita,Trofimoff
```

### Выходной файл
```csv
id,firstname,lastname,generated_link,shortened_link
1,Jack,Silver,http://localhost:3000/form/ABC?id=1&firstname=Jack&lastname=Silver,https://kutt.io/xyz123
2,Nikita,Trofimoff,http://localhost:3000/form/ABC?id=2&firstname=Nikita&lastname=Trofimoff,https://kutt.io/abc456
```

## Переменные окружения

```bash
# Kutt URL shortener
KUTT_API_URL=https://kutt-swww4os08c08g8wkskk0sgwo.stackbro.tech/api/v2
KUTT_API_KEY=your_api_key_here

# Bull Queue
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

BULL_JOB_ATTEMPTS=3
BULL_JOB_TIMEOUT=1m
BULL_JOB_BACKOFF_DELAY=3000
BULL_JOB_BACKOFF_TYPE=fixed
```

## Использование

1. Пользователь открывает модальное окно "Generate Link"
2. Нажимает кнопку "From .csv" и выбирает файл
3. Файл загружается на сервер, создается задача
4. Пользователь видит прогресс обработки
5. После завершения появляется кнопка "Download CSV"
6. Пользователь скачивает готовый файл с сокращенными ссылками

## Мониторинг

Логи доступны в консоли сервера:
```
[Queue] CsvShortenQueue#123 started
[Queue] Job 123 completed successfully. Processed: 1000, Failed: 5
[Queue] CsvShortenQueue#123 completed
```

## Ограничения

- Максимальный размер файла: 10MB
- Время жизни результата: 24 часа
- Максимальное количество попыток сокращения: 3
- Таймаут запроса к Kutt API: 10 секунд (это сервис поднятый на личном сервере. Возможна замена на внутрибанковское решение)

## Возможные будущие улучшения

- WebSocket для real-time обновлений (вместо polling)
- Поддержка пауз и возобновления обработки
- История задач для пользователя
- Экспорт в другие форматы (JSON, Excel)
- Настраиваемые параметры батчинга

