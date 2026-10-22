import {
  ActionEnum,
  AnswerValue,
  FieldKindEnum,
  FormField,
  Logic,
  NavigateAction,
  NumberCalculateAction,
  QUESTION_FIELD_KINDS,
  StringCalculateAction,
  Variable
} from '@voxly/shared-types-enums'

import { helper } from '@voxly/utils'

import { calculateAction } from './calculate-action'
import { validateRequiredField } from './validate'
import { evaluatePayloadCondition } from './validate-condition'

interface IFormField extends FormField {
  parent?: FormField
  isTouched?: boolean
}

export interface PickAndCalcFieldsResult {
  fields: IFormField[]
  variables: Record<string, AnswerValue>
}

function indexFields(fields: IFormField[]) {
  const parents = fields.filter(f => !f.parent && QUESTION_FIELD_KINDS.includes(f.kind))
  const children = fields.filter(f => f.parent && QUESTION_FIELD_KINDS.includes(f.kind))

  let index = 1
  const childrenIndexes: Record<string, number> = {}

  parents.forEach(f => {
    f.index = index++
  })

  children.forEach(f => {
    const parentId = f.parent!.id
    const parent = parents.find(p => p.id === parentId)

    if (!childrenIndexes[parentId]) {
      childrenIndexes[parentId] = 1
    }

    f.parent = parent
    f.index = childrenIndexes[parentId]++
  })
}

export function applyLogicToFields(
  fields?: IFormField[],
  logics?: Logic[],
  parameters?: Variable[],
  values?: Record<string, AnswerValue>
): PickAndCalcFieldsResult {
  const result: PickAndCalcFieldsResult = {
    fields: [],
    variables: {}
  }

  if (helper.isEmpty(fields)) {
    return result
  }

  if (helper.isValid(parameters)) {
    for (const variable of parameters!) {
      result.variables[variable.id] = variable.value
    }
  }

  if (helper.isEmpty(logics) || helper.isEmpty(values)) {
    // Add indexes to every field
    indexFields(fields!)

    return {
      ...result,
      fields: fields!.filter(f => f.kind !== FieldKindEnum.THANK_YOU)
    }
  }

  const visited = new Set<string>()

  function nextUnvisited(from: number): number {
    for (let i = from + 1; i < fields!.length; i++) {
      if (!visited.has(fields![i].id)) {
        return i
      }
    }

    return fields!.length
  }

  function jumpIndex(fieldId?: string): number {
    if (!fieldId) {
      return -1
    }

    const index = fields!.findIndex(f => f.id === fieldId)

    if (index < 0 || visited.has(fieldId)) {
      return -1
    }

    return index
  }

  let current = 0
  let steps = 0
  const maxSteps = fields!.length + 1

  while (current >= 0 && current < fields!.length && steps++ < maxSteps) {
    const field = fields![current]

    if (field.kind === FieldKindEnum.THANK_YOU) {
      break
    }

    if (visited.has(field.id)) {
      current = nextUnvisited(current)
      continue
    }

    visited.add(field.id)

    let isNavigateValidated = false
    let nextIndex = nextUnvisited(current)
    const logic = logics!.find(l => l.fieldId === field.id)

    // Add parent field if needed to present SubGroup fields
    if (field.parent && result.fields.findIndex(f => f.id === field.parent!.id) < 0) {
      result.fields.push(field.parent)
    }

    if (logic) {
      const { payloads } = logic
      const calculates = payloads.filter(p => p.action.kind === ActionEnum.CALCULATE)

      for (const calculate of calculates) {
        const { action } = calculate
        const isValidated = evaluatePayloadCondition(field, calculate, values)

        if (isValidated) {
          result.variables = calculateAction(
            action as NumberCalculateAction | StringCalculateAction,
            parameters,
            result.variables,
            values
          )
        }
      }

      const navigates = payloads.filter(p => p.action.kind === ActionEnum.NAVIGATE)

      for (const navigate of navigates) {
        const { action } = navigate

        field.isTouched = evaluatePayloadCondition(field, navigate, values)

        if (field.isTouched) {
          const index = jumpIndex((action as NavigateAction).fieldId)

          if (index >= 0) {
            nextIndex = index
            isNavigateValidated = true
            break
          }
        } else {
          field.isTouched = validateRequiredField(field, values)
        }
      }

      if (!isNavigateValidated && logic.defaultNavigate?.fieldId) {
        const index = jumpIndex(logic.defaultNavigate.fieldId)

        if (index >= 0) {
          nextIndex = index
        }
      }
    }

    result.fields.push(field)
    current = nextIndex
  }

  // Add indexes to every field
  indexFields(result.fields)

  return result
}
