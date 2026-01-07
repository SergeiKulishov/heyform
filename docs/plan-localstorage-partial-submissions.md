# Plan: localStorage Persistence for Partial Submissions with TTL

## Цель
Сохранять частичные ответы в localStorage с настраиваемым TTL, чтобы пользователь мог вернуться и продолжить заполнение.

## Требования
- TTL по умолчанию: 7 дней
- TTL настраивается в настройках формы
- При загрузке формы — восстановить сохранённые ответы если не истёк TTL
- При закрытии — сохранить в localStorage

---

## Фаза 1: Shared Types

### 1.1 Добавить настройку в FormSettings
**Файл:** `packages/shared-types-enums/src/form.ts`

```typescript
export interface FormSettings {
  // ... existing

  // Partial submission persistence
  enablePartialSubmission?: boolean  // default: true
  partialSubmissionTTL?: number      // в днях, default: 7
}
```

---

## Фаза 2: Server

### 2.1 Обновить GraphQL Input
**Файл:** `packages/server/src/common/graphql/form.graphql.ts`

Добавить в `UpdateFormInput`:
```typescript
@Field({ nullable: true })
enablePartialSubmission?: boolean

@Field({ nullable: true })
partialSubmissionTTL?: number
```

### 2.2 Обновить UpdateFormResolver
**Файл:** `packages/server/src/resolver/form/update-form.resolver.ts`

Добавить маппинг:
```typescript
['enablePartialSubmission', 'settings.enablePartialSubmission'],
['partialSubmissionTTL', 'settings.partialSubmissionTTL'],
```

---

## Фаза 3: Webapp Settings UI

### 3.1 Добавить UI в General Settings
**Файл:** `packages/webapp/src/pages/form/Settings/General.tsx`

```tsx
{/* Partial Submission */}
<Form.Item name="enablePartialSubmission" valuePropName="checked">
  <Switch label={t('form.settings.enablePartialSubmission')} />
</Form.Item>

{tempSettings?.enablePartialSubmission && (
  <Form.Item name="partialSubmissionTTL">
    <Input
      type="number"
      label={t('form.settings.partialSubmissionTTL')}
      suffix={t('form.settings.days')}
    />
  </Form.Item>
)}
```

---

## Фаза 4: Form Renderer

### 4.1 Добавить localStorage утилиты
**Файл (новый):** `packages/form-renderer/src/utils/storage.ts`

```typescript
interface StoredPartialSubmission {
  sessionId: string
  values: Record<string, any>
  hiddenFields: any[]
  scrollIndex: number
  savedAt: number
}

const STORAGE_KEY_PREFIX = 'heyform:partial:'

export function getStorageKey(formId: string): string {
  return `${STORAGE_KEY_PREFIX}${formId}`
}

export function savePartialToStorage(
  formId: string,
  data: Omit<StoredPartialSubmission, 'savedAt'>
): void {
  try {
    localStorage.setItem(getStorageKey(formId), JSON.stringify({
      ...data,
      savedAt: Date.now()
    }))
  } catch (e) {
    // localStorage might be full or disabled
  }
}

export function loadPartialFromStorage(
  formId: string,
  ttlDays: number = 7
): StoredPartialSubmission | null {
  try {
    const key = getStorageKey(formId)
    const data = localStorage.getItem(key)
    if (!data) return null

    const parsed: StoredPartialSubmission = JSON.parse(data)
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000

    if (Date.now() - parsed.savedAt > ttlMs) {
      localStorage.removeItem(key)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearPartialFromStorage(formId: string): void {
  try {
    localStorage.removeItem(getStorageKey(formId))
  } catch {}
}
```

### 4.2 Обновить IState
**Файл:** `packages/form-renderer/src/store.ts`

Добавить в IState:
```typescript
enablePartialSubmission?: boolean
partialSubmissionTTL?: number
```

### 4.3 Обновить Renderer инициализацию
**Файл:** `packages/form-renderer/src/Renderer.tsx`

При инициализации:
```typescript
// Load from localStorage if enabled
const ttl = form.settings?.partialSubmissionTTL ?? 7
const stored = form.settings?.enablePartialSubmission !== false
  ? loadPartialFromStorage(form.id, ttl)
  : null

const initStore: IState = {
  // ... existing
  sessionId: stored?.sessionId || (ssr ? '' : nanoid(16)),
  values: stored?.values || {},
  scrollIndex: stored?.scrollIndex || 0,
  enablePartialSubmission: form.settings?.enablePartialSubmission ?? true,
  partialSubmissionTTL: ttl,
}
```

### 4.4 Обновить beforeunload handler
**Файл:** `packages/form-renderer/src/views/Blocks.tsx`

```typescript
const handleBeforeUnload = useCallback(() => {
  if (state.isSubmitted || Object.keys(state.values).length === 0) return
  if (!state.enablePartialSubmission) return

  // Save to localStorage
  savePartialToStorage(state.formId, {
    sessionId: state.sessionId,
    values: state.values,
    hiddenFields: state.hiddenFields,
    scrollIndex: state.scrollIndex
  })

  // Send to server (existing logic)
  const partialData = { ... }
  navigator.sendBeacon('/api/partial-submission', JSON.stringify(partialData))
}, [state])
```

### 4.5 Очистить localStorage при успешной отправке
**Файл:** `packages/form-renderer/src/store.ts` или `Blocks.tsx`

После успешного submit:
```typescript
clearPartialFromStorage(state.formId)
```

---

## Фаза 5: Локализация

**Файлы:** `packages/webapp/src/locales/*.json`

```json
{
  "form.settings.enablePartialSubmission": "Save partial responses",
  "form.settings.partialSubmissionTTL": "Auto-save duration",
  "form.settings.days": "days"
}
```

Русский:
```json
{
  "form.settings.enablePartialSubmission": "Сохранять частичные ответы",
  "form.settings.partialSubmissionTTL": "Срок хранения",
  "form.settings.days": "дней"
}
```

---

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `packages/shared-types-enums/src/form.ts` | +enablePartialSubmission, +partialSubmissionTTL |
| `packages/server/src/common/graphql/form.graphql.ts` | +поля в UpdateFormInput |
| `packages/server/src/resolver/form/update-form.resolver.ts` | +маппинг настроек |
| `packages/webapp/src/pages/form/Settings/General.tsx` | +UI для настройки TTL |
| `packages/form-renderer/src/utils/storage.ts` | NEW: localStorage утилиты |
| `packages/form-renderer/src/store.ts` | +поля в IState |
| `packages/form-renderer/src/Renderer.tsx` | +загрузка из localStorage |
| `packages/form-renderer/src/views/Blocks.tsx` | +сохранение в localStorage |
| `packages/webapp/src/locales/*.json` | +переводы |

---

## Порядок реализации

1. shared-types-enums — добавить типы
2. server — GraphQL и resolver
3. webapp — UI настроек
4. form-renderer — localStorage логика
5. Локализация

---

## Примечания

- localStorage недоступен в SSR — проверять `typeof window !== 'undefined'`
- В приватном режиме браузера данные удаляются при закрытии
- Лимит localStorage ~5MB — для форм этого достаточно
