import {
  ActionEnum,
  ComparisonEnum,
  FieldKindEnum,
  FormField,
  Logic
} from '@voxly/shared-types-enums'
import { expect, test } from 'vitest'

import { applyLogicToFields, evaluatePayloadCondition } from '../src'

const field: FormField = {
  id: 'id_short_text',
  title: 'Short Text',
  kind: FieldKindEnum.SHORT_TEXT
}

const fields: FormField[] = [
  {
    id: 'id_short_text',
    title: 'Short Text',
    kind: FieldKindEnum.SHORT_TEXT
  },
  {
    id: 'id_statement',
    title: 'Statement',
    kind: FieldKindEnum.STATEMENT
  },
  {
    id: 'id_number',
    title: 'Number',
    kind: FieldKindEnum.NUMBER
  },
  {
    id: 'id_statement2',
    title: 'Statement2',
    kind: FieldKindEnum.STATEMENT
  },
  {
    id: 'id_date',
    title: 'Date',
    kind: FieldKindEnum.DATE
  }
]

test('evaluate AND conditions all true', () => {
  expect(
    evaluatePayloadCondition(
      field,
      {
        condition: {
          comparison: ComparisonEnum.CONTAINS,
          expected: 'hello'
        },
        conditions: [
          {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'hello'
          },
          {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'world'
          }
        ],
        connector: 'and'
      },
      { id_short_text: 'hello world' }
    )
  ).toBe(true)
})

test('evaluate AND conditions one false', () => {
  expect(
    evaluatePayloadCondition(
      field,
      {
        condition: {
          comparison: ComparisonEnum.CONTAINS,
          expected: 'hello'
        },
        conditions: [
          {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'hello'
          },
          {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'kitty'
          }
        ],
        connector: 'and'
      },
      { id_short_text: 'hello world' }
    )
  ).toBe(false)
})

test('evaluate OR conditions one true', () => {
  expect(
    evaluatePayloadCondition(
      field,
      {
        condition: {
          comparison: ComparisonEnum.CONTAINS,
          expected: 'kitty'
        },
        conditions: [
          {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'kitty'
          },
          {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'world'
          }
        ],
        connector: 'or'
      },
      { id_short_text: 'hello world' }
    )
  ).toBe(true)
})

test('evaluate OR conditions all false', () => {
  expect(
    evaluatePayloadCondition(
      field,
      {
        condition: {
          comparison: ComparisonEnum.CONTAINS,
          expected: 'kitty'
        },
        conditions: [
          {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'kitty'
          },
          {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'puppy'
          }
        ],
        connector: 'or'
      },
      { id_short_text: 'hello world' }
    )
  ).toBe(false)
})

test('evaluate legacy single condition', () => {
  expect(
    evaluatePayloadCondition(
      field,
      {
        condition: {
          comparison: ComparisonEnum.CONTAINS,
          expected: 'hello'
        }
      },
      { id_short_text: 'hello world' }
    )
  ).toBe(true)

  expect(
    evaluatePayloadCondition(
      field,
      {
        condition: {
          comparison: ComparisonEnum.CONTAINS,
          expected: 'kitty'
        }
      },
      { id_short_text: 'hello world' }
    )
  ).toBe(false)
})

test('defaultNavigate jumps to target field', () => {
  const logics: Logic[] = [
    {
      fieldId: 'id_short_text',
      payloads: [
        {
          id: 'p1',
          condition: {
            comparison: ComparisonEnum.CONTAINS,
            expected: 'kitty'
          },
          action: {
            kind: ActionEnum.NAVIGATE,
            fieldId: 'id_number'
          }
        }
      ],
      defaultNavigate: {
        fieldId: 'id_date'
      }
    }
  ]

  const result = applyLogicToFields(fields, logics, undefined, {
    id_short_text: 'hello world'
  })

  expect(result.fields.map(f => f.id)).toStrictEqual(['id_short_text', 'id_date'])
})

test('defaultNavigate ignored when target does not exist', () => {
  const logics: Logic[] = [
    {
      fieldId: 'id_short_text',
      payloads: [],
      defaultNavigate: {
        fieldId: 'id_missing'
      }
    }
  ]

  const result = applyLogicToFields(fields, logics, undefined, {
    id_short_text: 'hello world'
  })

  expect(result.fields.map(f => f.id)).toStrictEqual(fields.map(f => f.id))
})

test('defaultNavigate ignored when target is before source', () => {
  const logics: Logic[] = [
    {
      fieldId: 'id_number',
      payloads: [
        {
          id: 'p1',
          condition: {
            comparison: ComparisonEnum.EQUAL,
            expected: 5
          },
          action: {
            kind: ActionEnum.NAVIGATE,
            fieldId: 'id_date'
          }
        }
      ],
      defaultNavigate: {
        fieldId: 'id_short_text'
      }
    }
  ]

  const result = applyLogicToFields(fields, logics, undefined, { id_number: 10 })

  expect(result.fields.map(f => f.id)).toStrictEqual(fields.map(f => f.id))
})
