import {
  ActionEnum,
  CalculateEnum,
  ComparisonEnum,
  FieldKindEnum,
  FormField,
  Logic,
  LogicCondition,
  Variable
} from '@voxly/shared-types-enums'
import { expect, test } from 'vitest'

import { applyLogicToFields } from '../src/apply-logic-to-fields'
import { validateCondition } from '../src/validate-condition'

const fields: FormField[] = [
  {
    id: 'q1',
    title: 'Q1',
    kind: FieldKindEnum.MULTIPLE_CHOICE,
    properties: {
      choices: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' }
      ]
    }
  },
  {
    id: 'q2',
    title: 'Q2',
    kind: FieldKindEnum.SHORT_TEXT
  },
  {
    id: 'q3',
    title: 'Q3',
    kind: FieldKindEnum.SHORT_TEXT
  },
  {
    id: 'thanks',
    title: 'Thanks',
    kind: FieldKindEnum.THANK_YOU
  }
]

const variables: Variable[] = [
  {
    id: 'score',
    name: 'Score',
    kind: 'number',
    value: 0,
    logics: []
  },
  {
    id: 'label',
    name: 'Label',
    kind: 'string',
    value: '',
    logics: []
  }
]

const answerA = { value: ['A'], other: '' }
const answerB = { value: ['B'], other: '' }

function scoreLogic(
  comparison: ComparisonEnum,
  expected: number,
  action: any = { kind: ActionEnum.NAVIGATE, fieldId: 'thanks' }
): Logic {
  return {
    fieldId: 'q2',
    payloads: [
      {
        id: 'nav_score',
        condition: {
          fieldId: 'score',
          comparison,
          expected
        } as LogicCondition,
        action
      }
    ]
  }
}

const scoreCalculate: Logic = {
  fieldId: 'q1',
  payloads: [
    {
      id: 'calc_score',
      condition: {
        comparison: ComparisonEnum.CONTAINS,
        expected: 'A'
      },
      action: {
        kind: ActionEnum.CALCULATE,
        variable: 'score',
        operator: CalculateEnum.ADDITION,
        value: 5
      }
    }
  ]
}

test('numeric variable subject: score >= 5 jumps when score is 5', () => {
  const result = applyLogicToFields(
    fields,
    [scoreCalculate, scoreLogic(ComparisonEnum.GREATER_OR_EQUAL_THAN, 5)],
    variables,
    {
      q1: answerA,
      q2: 'some text'
    }
  )

  expect(result.variables).toStrictEqual({ score: 5, label: '' })
  expect(result.fields.map(f => f.id)).toStrictEqual(['q1', 'q2'])
})

test('numeric variable subject: score >= 6 does not jump when score is 5', () => {
  const result = applyLogicToFields(
    fields,
    [scoreCalculate, scoreLogic(ComparisonEnum.GREATER_OR_EQUAL_THAN, 6)],
    variables,
    {
      q1: answerA,
      q2: 'some text'
    }
  )

  expect(result.variables).toStrictEqual({ score: 5, label: '' })
  expect(result.fields.map(f => f.id)).toStrictEqual(['q1', 'q2', 'q3'])
})

test('numeric variable subject: score is 0 on branch B', () => {
  const result = applyLogicToFields(
    fields,
    [scoreCalculate, scoreLogic(ComparisonEnum.GREATER_OR_EQUAL_THAN, 5)],
    variables,
    {
      q1: answerB,
      q2: 'some text'
    }
  )

  expect(result.variables).toStrictEqual({ score: 0, label: '' })
  expect(result.fields.map(f => f.id)).toStrictEqual(['q1', 'q2', 'q3'])
})

test('calculate runs before navigate on the same field', () => {
  const logic: Logic = {
    fieldId: 'q2',
    payloads: [
      {
        id: 'calc_here',
        condition: {
          comparison: ComparisonEnum.IS,
          expected: 'some text'
        },
        action: {
          kind: ActionEnum.CALCULATE,
          variable: 'score',
          operator: CalculateEnum.ADDITION,
          value: 5
        }
      },
      {
        id: 'nav_here',
        condition: {
          fieldId: 'score',
          comparison: ComparisonEnum.GREATER_OR_EQUAL_THAN,
          expected: 5
        } as LogicCondition,
        action: {
          kind: ActionEnum.NAVIGATE,
          fieldId: 'thanks'
        }
      }
    ]
  }

  const result = applyLogicToFields(fields, [logic], variables, {
    q1: answerB,
    q2: 'some text'
  })

  expect(result.variables).toStrictEqual({ score: 5, label: '' })
  expect(result.fields.map(f => f.id)).toStrictEqual(['q1', 'q2'])
})

test('string variable subject: starts_with / contains', () => {
  const calculate: Logic = {
    fieldId: 'q1',
    payloads: [
      {
        id: 'assign_label',
        condition: {
          comparison: ComparisonEnum.CONTAINS,
          expected: 'A'
        },
        action: {
          kind: ActionEnum.CALCULATE,
          variable: 'label',
          operator: CalculateEnum.ASSIGNMENT,
          value: 'hello kitty'
        }
      }
    ]
  }

  function labelLogic(comparison: ComparisonEnum, expected: string): Logic {
    return {
      fieldId: 'q2',
      payloads: [
        {
          id: 'nav_label',
          condition: {
            fieldId: 'label',
            comparison,
            expected
          } as LogicCondition,
          action: {
            kind: ActionEnum.NAVIGATE,
            fieldId: 'thanks'
          }
        }
      ]
    }
  }

  const startsWith = applyLogicToFields(
    fields,
    [calculate, labelLogic(ComparisonEnum.STARTS_WITH, 'hello')],
    variables,
    { q1: answerA, q2: 'text' }
  )
  expect(startsWith.fields.map(f => f.id)).toStrictEqual(['q1', 'q2'])

  const contains = applyLogicToFields(
    fields,
    [calculate, labelLogic(ComparisonEnum.CONTAINS, 'kitty')],
    variables,
    { q1: answerA, q2: 'text' }
  )
  expect(contains.fields.map(f => f.id)).toStrictEqual(['q1', 'q2'])

  const notContains = applyLogicToFields(
    fields,
    [calculate, labelLogic(ComparisonEnum.CONTAINS, 'dog')],
    variables,
    { q1: answerA, q2: 'text' }
  )
  expect(notContains.fields.map(f => f.id)).toStrictEqual(['q1', 'q2', 'q3'])

  const notStartsWith = applyLogicToFields(
    fields,
    [calculate, labelLogic(ComparisonEnum.STARTS_WITH, 'kitty')],
    variables,
    { q1: answerA, q2: 'text' }
  )
  expect(notStartsWith.fields.map(f => f.id)).toStrictEqual(['q1', 'q2', 'q3'])
})

test('multi conditions: field and variable with and connector', () => {
  const logic: Logic = {
    fieldId: 'q2',
    payloads: [
      {
        id: 'multi_and',
        condition: {
          comparison: ComparisonEnum.IS,
          expected: 'text'
        },
        conditions: [
          {
            comparison: ComparisonEnum.IS,
            expected: 'text'
          },
          {
            fieldId: 'score',
            comparison: ComparisonEnum.GREATER_OR_EQUAL_THAN,
            expected: 5
          } as LogicCondition
        ],
        connector: 'and',
        action: {
          kind: ActionEnum.NAVIGATE,
          fieldId: 'thanks'
        }
      }
    ]
  }

  const matched = applyLogicToFields(fields, [scoreCalculate, logic], variables, {
    q1: answerA,
    q2: 'text'
  })
  expect(matched.fields.map(f => f.id)).toStrictEqual(['q1', 'q2'])

  const unmatched = applyLogicToFields(fields, [scoreCalculate, logic], variables, {
    q1: answerB,
    q2: 'text'
  })
  expect(unmatched.fields.map(f => f.id)).toStrictEqual(['q1', 'q2', 'q3'])

  const orLogic: Logic = {
    ...logic,
    payloads: [
      {
        ...logic.payloads[0],
        connector: 'or'
      }
    ]
  }

  const orMatched = applyLogicToFields(fields, [scoreCalculate, orLogic], variables, {
    q1: answerB,
    q2: 'text'
  })
  expect(orMatched.fields.map(f => f.id)).toStrictEqual(['q1', 'q2'])
})

test('unknown variable id in condition falls back to the source field', () => {
  const logic: Logic = {
    fieldId: 'q2',
    payloads: [
      {
        id: 'unknown_subject',
        condition: {
          fieldId: 'unknown_variable',
          comparison: ComparisonEnum.IS,
          expected: 'text'
        } as LogicCondition,
        action: {
          kind: ActionEnum.NAVIGATE,
          fieldId: 'thanks'
        }
      }
    ]
  }

  const filled = applyLogicToFields(fields, [logic], variables, {
    q1: answerA,
    q2: 'text'
  })
  expect(filled.fields.map(f => f.id)).toStrictEqual(['q1', 'q2'])

  const empty = applyLogicToFields(fields, [logic], variables, {
    q1: answerA,
    q2: ''
  })
  expect(empty.fields.map(f => f.id)).toStrictEqual(['q1', 'q2', 'q3'])
})

test('validateCondition resolves a variable subject', () => {
  const condition = {
    fieldId: 'score',
    comparison: ComparisonEnum.GREATER_OR_EQUAL_THAN,
    expected: 5
  } as LogicCondition

  expect(validateCondition(fields[1], condition, {}, variables, { score: 5 })).toBe(true)
  expect(validateCondition(fields[1], condition, {}, variables, { score: 4 })).toBe(false)
})

test('validateCondition keeps legacy behaviour without variables', () => {
  const condition: LogicCondition = {
    comparison: ComparisonEnum.CONTAINS,
    expected: 'kitty'
  }

  expect(validateCondition(fields[1], condition, { q2: 'hello kitty' })).toBe(true)
  expect(validateCondition(fields[1], condition, { q2: 'hello world' })).toBe(false)
})
