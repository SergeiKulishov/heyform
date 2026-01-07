# Partial Submission Tracking

Функциональность отслеживания частичных ответов в формах HeyForm.

## Обзор

Partial Submission Tracking позволяет отслеживать ответы пользователей по мере заполнения формы, даже если они не завершили её полностью. Это даёт возможность:

- Видеть, на каком вопросе пользователи покидают форму
- Анализировать воронку заполнения (completion funnel)
- Понимать причины низкой конверсии
- Оптимизировать порядок и формулировки вопросов

## Архитектура

### Хранение данных

Частичные ответы хранятся в той же коллекции `Submission`, что и завершённые, с дополнительными полями:

```typescript
interface SubmissionModel {
  // ... существующие поля
  sessionId?: string       // Уникальный идентификатор сессии заполнения
  lastFieldId?: string     // ID последнего отвеченного вопроса
  lastFieldIndex?: number  // Индекс последнего вопроса (0-based)
  isCompleted: boolean     // Флаг завершения (default: true)
}
```

### Статусы

В `SubmissionStatusEnum` добавлен новый статус:

```typescript
enum SubmissionStatusEnum {
  PUBLIC = 1,
  PRIVATE = 2,
  DELETED = 3,
  PARTIAL = 4  // Частичный ответ
}
```

## Как это работает

### 1. Генерация Session ID

При загрузке формы в form-renderer генерируется уникальный `sessionId`:

```typescript
// packages/form-renderer/src/Renderer.tsx
sessionId: ssr ? '' : nanoid(16)
```

### 2. Отправка Partial Submission

При выходе пользователя со страницы (событие `beforeunload`) отправляется partial submission через `navigator.sendBeacon`:

```typescript
// packages/form-renderer/src/views/Blocks.tsx
const handleBeforeUnload = useCallback(() => {
  if (state.isSubmitted || Object.keys(state.values).length === 0) return

  const currentField = state.fields[state.scrollIndex]
  const partialData = {
    formId: state.formId,
    sessionId: state.sessionId,
    answers: state.values,
    hiddenFields: state.hiddenFields,
    lastFieldId: currentField?.id,
    lastFieldIndex: state.scrollIndex,
    partialSubmission: true
  }

  navigator.sendBeacon('/api/partial-submission', JSON.stringify(partialData))
}, [state])
```

### 3. REST Endpoint

Для sendBeacon используется REST endpoint (GraphQL не поддерживает sendBeacon):

```
POST /api/partial-submission
Content-Type: application/json

{
  "formId": "string",
  "sessionId": "string",
  "answers": { ... },
  "hiddenFields": [ ... ],
  "lastFieldId": "string",
  "lastFieldIndex": number,
  "partialSubmission": true
}
```

### 4. Session Merging

Если пользователь возвращается и завершает форму, происходит слияние:

1. Поиск существующего partial submission по `sessionId`
2. Если найден — обновление существующей записи
3. Если не найден — создание новой записи
4. При завершении: `isCompleted = true`, `status = PUBLIC`

```typescript
// packages/server/src/resolver/endpoint/complete-submission.resolver.ts
let existingSubmission = null
if (input.sessionId) {
  existingSubmission = await this.submissionService.findBySessionId(
    form.id,
    input.sessionId
  )
}

if (existingSubmission && !existingSubmission.isCompleted) {
  // Обновляем существующий partial
  await this.submissionService.updatePartial(existingSubmission.id, updates)
} else {
  // Создаём новый
  await this.submissionService.create(submission)
}
```

## API

### GraphQL Query: funnelAnalytics

```graphql
query funnelAnalytics($input: FormDetailInput!) {
  funnelAnalytics(input: $input) {
    totalViews        # Общее количество просмотров формы
    totalCompleted    # Количество завершённых ответов
    totalPartial      # Количество частичных ответов
    completionRate    # Процент завершения (0-100)
    dropOffByField {  # Статистика отказов по вопросам
      fieldId         # ID вопроса
      fieldTitle      # Заголовок вопроса
      count           # Количество отказов на этом вопросе
      percentage      # Процент от общего числа partial
    }
  }
}
```

### REST Endpoint: Partial Submission

```
POST /api/partial-submission

Request Body:
{
  "formId": "string",           // Required
  "sessionId": "string",        // Required
  "answers": { ... },           // Required
  "hiddenFields": [ ... ],      // Optional
  "lastFieldId": "string",      // Optional
  "lastFieldIndex": number,     // Optional
  "partialSubmission": true     // Required
}

Response:
{
  "success": true
}
```

## UI

### Фильтр Submissions

В списке ответов добавлена категория "Partial" для просмотра незавершённых ответов:

- **Inbox** — завершённые ответы
- **Spam** — помеченные как спам
- **Partial** — частичные (незавершённые) ответы

### Funnel Analytics

На странице Analytics отображается секция "Completion Funnel" с:

1. **Метрики:**
   - Completed — количество завершённых
   - Partial — количество частичных
   - Total Views — общее количество просмотров
   - Completion Rate — процент завершения

2. **График Drop-off by Question:**
   - Список вопросов с количеством отказов
   - Процентный показатель для каждого вопроса
   - Визуальная шкала (progress bar)

## Локализация

Добавлены ключи переводов для 8 языков:

| Ключ | EN | RU |
|------|----|----|
| `form.analytics.funnel.title` | Completion Funnel | Воронка заполнения |
| `form.analytics.funnel.completed` | Completed | Завершённые |
| `form.analytics.funnel.partial` | Partial | Частичные |
| `form.analytics.funnel.views` | Total Views | Всего просмотров |
| `form.analytics.funnel.completionRate` | Completion Rate | Процент завершения |
| `form.analytics.funnel.dropOffByField` | Drop-off by Question | Отказы по вопросам |
| `form.analytics.funnel.noDropOff` | No partial submissions yet | Пока нет частичных ответов |
| `form.submissions.partial` | Partial | Частичные |

## Ограничения

1. **sendBeacon payload limit** — ~64KB. Большие файловые ответы могут не поместиться.

2. **beforeunload reliability** — событие не гарантируется на 100% в мобильных браузерах.

3. **Миграция данных** — существующие submissions автоматически имеют `isCompleted: true`.

## Файлы

### Server

| Файл | Описание |
|------|----------|
| `packages/server/src/model/submission.model.ts` | Модель с новыми полями |
| `packages/server/src/service/submission.service.ts` | Методы для partial submissions |
| `packages/server/src/resolver/endpoint/complete-submission.resolver.ts` | Логика session merging |
| `packages/server/src/controller/partial-submission.controller.ts` | REST endpoint |
| `packages/server/src/resolver/form/funnel-analytics.resolver.ts` | GraphQL query |
| `packages/server/src/common/graphql/form.graphql.ts` | GraphQL types |

### Form Renderer

| Файл | Описание |
|------|----------|
| `packages/form-renderer/src/store.ts` | State с sessionId |
| `packages/form-renderer/src/Renderer.tsx` | Генерация sessionId |
| `packages/form-renderer/src/views/Blocks.tsx` | beforeunload handler |

### Webapp

| Файл | Описание |
|------|----------|
| `packages/webapp/src/services/form.ts` | funnelAnalytics method |
| `packages/webapp/src/consts/gql.ts` | FUNNEL_ANALYTICS_GQL query |
| `packages/webapp/src/pages/form/Analytics/Funnel.tsx` | Funnel component |
| `packages/webapp/src/pages/form/Analytics/index.tsx` | Analytics page |
| `packages/webapp/src/pages/form/Submissions/index.tsx` | Partial filter |
| `packages/webapp/src/locales/*.json` | Переводы |
