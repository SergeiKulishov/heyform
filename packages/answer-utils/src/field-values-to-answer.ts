import { Answer, CHOICES_FIELD_KINDS, FormField } from '@voxly/shared-types-enums'

import { helper } from '@voxly/utils'

import { fieldsToValidateRules } from './fields-to-validate-rules'
import { validate } from './validate'

export function fieldValuesToAnswers(
  fields: FormField[],
  values: Record<string, any>,
  partialSubmission?: boolean
): Answer[] {
  const rules = fieldsToValidateRules(fields)
  const answers: Answer[] = []

  for (const rule of rules) {
    let value = values[rule.id]

    if (partialSubmission) {
      try {
        // Validate the value, if it fails, an exception will be thrown
        validate(rule, value)

        answers.push({
          id: rule.id,
          title: rule.title,
          kind: rule.kind,
          properties: rule.properties || {},
          value
        } as any)
      } catch (_) {}

      // Partial submission does not need to throw error
      continue
    }

    // Validate the value, if it fails, an exception will be thrown
    validate(rule, value)

    if (helper.isEmpty(value)) {
      if (CHOICES_FIELD_KINDS.includes(rule.kind)) {
        value = {
          value: []
        }
      } else {
        value = ''
      }
    }

    answers.push({
      id: rule.id,
      title: rule.title,
      kind: rule.kind,
      properties: rule.properties || {},
      value
    } as any)
  }

  return answers
}
