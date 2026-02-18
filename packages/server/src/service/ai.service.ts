import { Injectable, Logger } from '@nestjs/common'
import { OpenAI } from 'openai'

import { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_GPT_MODEL } from '@environments'
import { helper, nanoid } from '@voxly/utils'

const FORM_FIELDS_SYSTEM_PROMPT = `You are a form builder assistant. Return ONLY a valid JSON object with a single key "fields" containing an array of form field objects.

Field kinds and their properties:
- short_text — single-line text input. No extra properties.
- long_text — multi-line text input. No extra properties.
- email — email address input. No extra properties.
- phone_number — phone number input. No extra properties.
- number — numeric input. No extra properties.
- url — URL input. No extra properties.
- date — date picker. No extra properties.
- yes_no — binary yes/no choice. No extra properties.
- statement — informational text shown to the respondent, not a question (no answer expected). No extra properties.
- multiple_choice — single or multiple select. properties: { choices: [{ id, label }], allowMultiple?: boolean }
- rating — star/emoji rating. properties: { total: 5 } (or 10)
- opinion_scale — numeric scale 1–10. properties: { total: 10, leftLabel?: string, rightLabel?: string }
- nps — Net Promoter Score 0–10. properties: { total: 10 }
- ranking — drag-to-rank items. properties: { choices: [{ id, label }] }
- matrix — grid of rows × columns. properties: { rows: [{ id, label }], matrixColumns: [{ id, label }] }

Each field object structure:
{
  "kind": "<kind>",
  "title": "<question text>",
  "description": "<optional hint>",
  "validations": { "required": true | false },
  "properties": { <depends on kind, omit if not needed> }
}

Example output:
{
  "fields": [
    {
      "kind": "short_text",
      "title": "What is your full name?",
      "validations": { "required": true }
    },
    {
      "kind": "multiple_choice",
      "title": "How did you hear about us?",
      "validations": { "required": false },
      "properties": {
        "choices": [
          { "id": "c1", "label": "Social media" },
          { "id": "c2", "label": "Friend referral" },
          { "id": "c3", "label": "Search engine" }
        ]
      }
    },
    {
      "kind": "rating",
      "title": "How would you rate your experience?",
      "validations": { "required": true },
      "properties": { "total": 5 }
    }
  ]
}

Rules:
- Generate 5-10 questions appropriate for the topic
- Use diverse question types that fit the content
- For multiple_choice / ranking provide 3-5 meaningful choices
- For matrix provide 2-4 rows and 3-5 columns
- "validations" ONLY accepts: required (boolean). Do NOT put allowMultiple or any other field there
- Return ONLY the JSON object, no markdown, no explanation`

const FORM_FIELDS_EDIT_SYSTEM_PROMPT = `You are a form editing assistant. You will receive the CURRENT form fields as JSON and a user instruction.

Your task: return the COMPLETE updated field list after applying the instruction.

Instructions can be:
- ADD: "add a question about X" → append new field(s) to the list
- REMOVE: "remove question about X" or "remove the last question" → remove matching field(s)
- EDIT: "change question 2 to ask about Y" → modify that specific field
- REORDER: "move question X before Y" → reorder fields

Field kinds and their properties:
- short_text — single-line text input. No extra properties.
- long_text — multi-line text input. No extra properties.
- email — email address input. No extra properties.
- phone_number — phone number input. No extra properties.
- number — numeric input. No extra properties.
- url — URL input. No extra properties.
- date — date picker. No extra properties.
- yes_no — binary yes/no choice. No extra properties.
- statement — informational text shown to the respondent, not a question. No extra properties.
- multiple_choice — single or multiple select. properties: { choices: [{ id, label }], allowMultiple?: boolean }
- rating — star/emoji rating. properties: { total: 5 } (or 10)
- opinion_scale — numeric scale 1–10. properties: { total: 10, leftLabel?: string, rightLabel?: string }
- nps — Net Promoter Score 0–10. properties: { total: 10 }
- ranking — drag-to-rank items. properties: { choices: [{ id, label }] }
- matrix — grid of rows × columns. properties: { rows: [{ id, label }], matrixColumns: [{ id, label }] }

CRITICAL RULES:
- Keep ALL existing fields unless explicitly told to remove them
- Preserve the exact "id" of existing fields — do NOT change their ids
- Only modify exactly what the user asks for
- Return the COMPLETE list (all fields, including unchanged ones)
- For new fields, generate a unique id (12 random alphanumeric chars)
- Do NOT include welcome_screen or thank_you fields — they are added automatically
- "validations" ONLY accepts: required (boolean). Do NOT put allowMultiple or any other field in validations — they belong in "properties"

Return ONLY a JSON object: { "fields": [...] }, no markdown, no explanation.`

const FORM_LOGICS_SYSTEM_PROMPT = `You are a form logic assistant. Given a list of form fields and a user instruction, return ONLY a valid JSON object with a single key "logics" containing an array of logic rule objects.

Each logic rule:
{
  "fieldId": "the field id that triggers the rule",
  "payloads": [{
    "condition": {
      "fieldId": "same field id",
      "operator": one of [is, is_not, contains, starts_with, ends_with, greater_than, less_than, is_empty, is_not_empty],
      "value": "comparison value"
    },
    "action": {
      "kind": one of [navigate, calculate],
      "fieldId": "target field id for navigate, or variable id for calculate"
    }
  }]
}

Return ONLY the JSON object, no markdown, no explanation.`

const FORM_AUDIT_SYSTEM_PROMPT = `You are a form quality reviewer. Analyze the given form fields and return specific, actionable suggestions.


Check for:
- Spelling and grammar errors in question titles and descriptions (check in whatever language the questions are written in)
- Duplicate or very similar questions
- Vague or unclear question wording
- Wrong field type (e.g. asking for age with short_text instead of number)
- Missing important fields for the form's apparent purpose
- Overly long forms (>15 questions) or too short (<3 questions) for a serious topic
- Too many required fields (friction)
- Missing descriptions on complex questions (multiple_choice, matrix)

Return ONLY a JSON object: { "suggestions": [...] }

Each suggestion:
{
  "severity": "warning" | "info",
  "fieldIndex": <1-based integer or null for general form-level feedback>,
  "title": "<short issue title, max 6 words>",
  "description": "<specific actionable recommendation, 1-2 sentences>"
}

Return 3-7 most important suggestions. If the form is good, return { "suggestions": [] }.
Write all "title" and "description" values in the same language as the form questions.
Return ONLY JSON, no markdown, no explanation.

IMPORTANT!: Write your suggestions in the same language as the form questions. `

const FORM_THEME_SYSTEM_PROMPT = `You are a form theme assistant. Given a current theme JSON and a user instruction, return ONLY a valid JSON object with updated theme properties.

Theme properties you can set:
- questionTextColor: hex color string
- answerTextColor: hex color string
- buttonBackground: hex color string
- buttonTextColor: hex color string
- backgroundColor: hex color string
- fontFamily: font name string

Return ONLY the JSON object with the theme properties to update, no markdown, no explanation.`

/**
 * Extracts a JSON object or array from a string that may contain markdown
 * code blocks or extra text. Works with models that don't support
 * response_format: json_object.
 */
function extractJson(text: string): any {
  // Strip markdown code block if present: ```json ... ``` or ``` ... ```
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = codeBlock ? codeBlock[1].trim() : text.trim()

  // Find the first { or [ and match to closing } or ]
  const start = candidate.search(/[{[]/)
  if (start === -1) throw new SyntaxError('No JSON found in response')

  const openChar = candidate[start]
  const closeChar = openChar === '{' ? '}' : ']'
  let depth = 0
  let end = -1

  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === openChar) depth++
    else if (candidate[i] === closeChar) {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end === -1) throw new SyntaxError('Unterminated JSON in response')

  return JSON.parse(candidate.slice(start, end + 1))
}

const VALID_VALIDATION_KEYS = new Set(['required', 'min', 'max', 'matchExpected'])

/**
 * Strips unknown keys from `validations` and moves misplaced field-level flags
 * (e.g. allowMultiple from multiple_choice) into `properties` where they belong.
 */
function sanitizeField(f: any): any {
  const validations: any = {}
  const extraFromValidations: any = {}

  if (f.validations && typeof f.validations === 'object') {
    for (const [k, v] of Object.entries(f.validations)) {
      if (VALID_VALIDATION_KEYS.has(k)) {
        validations[k] = v
      } else {
        extraFromValidations[k] = v
      }
    }
  }

  const properties =
    Object.keys(extraFromValidations).length > 0
      ? { ...extraFromValidations, ...(f.properties || {}) }
      : (f.properties ?? null)

  return {
    ...f,
    validations,
    properties
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  private get openai() {
    return new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL || undefined
    })
  }

  async generateFormFields(topic: string, reference?: string): Promise<any[]> {
    const userContent = reference
      ? `Create a form about: ${topic}\n\nReference context (use this to make questions specific):\n${reference}`
      : `Create a form about: ${topic}`

    try {
      const { choices } = await this.openai.chat.completions.create({
        model: OPENAI_GPT_MODEL,
        temperature: 0.7,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: FORM_FIELDS_SYSTEM_PROMPT },
          { role: 'user', content: userContent }
        ]
      })

      if (!helper.isValidArray(choices) || !choices[0].message.content) {
        return []
      }

      const parsed = extractJson(choices[0].message.content)
      const fields = parsed.fields || parsed

      if (!helper.isValidArray(fields)) {
        return []
      }

      return fields.map((f: any) =>
        sanitizeField({ ...f, id: nanoid(12), validations: f.validations || { required: false } })
      )
    } catch (err) {
      this.logger.error('Failed to generate form fields', err)
      return []
    }
  }

  async editFormFields(
    existingFields: any[],
    prompt: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<any[]> {
    const recentHistory = history ? history.slice(-10) : []

    const userMessage = `Current form fields:\n${JSON.stringify(existingFields, null, 2)}\n\nInstruction: ${prompt}`

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: FORM_FIELDS_EDIT_SYSTEM_PROMPT },
      ...recentHistory.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ]

    try {
      const { choices } = await this.openai.chat.completions.create({
        model: OPENAI_GPT_MODEL,
        temperature: 0.3,
        max_tokens: 4000,
        messages
      })

      if (!helper.isValidArray(choices) || !choices[0].message.content) {
        return []
      }

      const parsed = extractJson(choices[0].message.content)
      const fields = parsed.fields || parsed

      if (!helper.isValidArray(fields)) {
        return []
      }

      return fields.map((f: any) =>
        sanitizeField({
          ...f,
          id: f.id || nanoid(12),
          validations: f.validations || { required: false }
        })
      )
    } catch (err) {
      this.logger.error('Failed to edit form fields', err)
      return []
    }
  }

  async generateFormLogics(fields: any[], prompt: string): Promise<any[]> {
    const fieldsContext = fields
      .filter(f => f.kind !== 'thank_you' && f.kind !== 'welcome')
      .map(f => ({ id: f.id, kind: f.kind, title: f.title }))

    try {
      const { choices } = await this.openai.chat.completions.create({
        model: OPENAI_GPT_MODEL,
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: FORM_LOGICS_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Form fields:\n${JSON.stringify(fieldsContext, null, 2)}\n\nInstruction: ${prompt}`
          }
        ]
      })

      if (!helper.isValidArray(choices) || !choices[0].message.content) {
        return []
      }

      const parsed = extractJson(choices[0].message.content)
      return parsed.logics || []
    } catch (err) {
      this.logger.error('Failed to generate form logics', err)
      return []
    }
  }

  async auditFormFields(fields: any[]): Promise<any[]> {
    const questionFields = fields
      .filter(f => f.kind !== 'thank_you' && f.kind !== 'welcome')
      .map((f, i) => ({
        index: i + 1,
        id: f.id,
        kind: f.kind,
        title: f.title,
        required: f.validations?.required ?? false,
        properties: f.properties ?? null
      }))

    try {
      const { choices } = await this.openai.chat.completions.create({
        model: OPENAI_GPT_MODEL,
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: FORM_AUDIT_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Form fields:\n${JSON.stringify(questionFields, null, 2)}`
          }
        ]
      })

      if (!helper.isValidArray(choices) || !choices[0].message.content) {
        return []
      }

      const parsed = extractJson(choices[0].message.content)
      return parsed.suggestions || []
    } catch (err) {
      this.logger.error('Failed to audit form fields', err)
      return []
    }
  }

  async generateFormTheme(currentTheme: string, prompt: string): Promise<any> {
    try {
      const { choices } = await this.openai.chat.completions.create({
        model: OPENAI_GPT_MODEL,
        temperature: 0.5,
        max_tokens: 500,
        messages: [
          { role: 'system', content: FORM_THEME_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Current theme:\n${currentTheme}\n\nInstruction: ${prompt}`
          }
        ]
      })

      if (!helper.isValidArray(choices) || !choices[0].message.content) {
        return {}
      }

      return extractJson(choices[0].message.content)
    } catch (err) {
      this.logger.error('Failed to generate form theme', err)
      return {}
    }
  }
}
