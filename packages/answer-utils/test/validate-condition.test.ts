import {
  Choice,
  ComparisonEnum,
  FieldKindEnum,
  FormField,
  LogicCondition
} from '@voxly/shared-types-enums'
import { expect, test } from 'vitest'

import { validateCondition } from '../src/validate-condition'

const choices: Choice[] = [
  { id: 'choice_a', label: 'A' },
  { id: 'choice_b', label: 'B' },
  { id: 'choice_c', label: 'C' }
]

const singleChoiceField: FormField = {
  id: 'field_single_choice',
  kind: FieldKindEnum.MULTIPLE_CHOICE,
  properties: {
    choices
  }
}

const multipleChoiceField: FormField = {
  id: 'field_multiple_choice',
  kind: FieldKindEnum.MULTIPLE_CHOICE,
  properties: {
    choices,
    allowMultiple: true
  }
}

const singleValue = {
  value: ['choice_a'],
  other: ''
}

const multipleValue = {
  value: ['choice_a', 'choice_b'],
  other: ''
}

test('single choice CONTAINS selected id', () => {
  const condition: LogicCondition = {
    comparison: ComparisonEnum.CONTAINS,
    expected: ['choice_a']
  }

  expect(
    validateCondition(singleChoiceField, condition, { [singleChoiceField.id]: singleValue })
  ).toBe(true)
})

test('single choice CONTAINS other id', () => {
  const condition: LogicCondition = {
    comparison: ComparisonEnum.CONTAINS,
    expected: ['choice_b']
  }

  expect(
    validateCondition(singleChoiceField, condition, { [singleChoiceField.id]: singleValue })
  ).toBe(false)
})

test('single choice DOES_NOT_CONTAIN selected id', () => {
  const condition: LogicCondition = {
    comparison: ComparisonEnum.DOES_NOT_CONTAIN,
    expected: ['choice_a']
  }

  expect(
    validateCondition(singleChoiceField, condition, { [singleChoiceField.id]: singleValue })
  ).toBe(false)
})

test('single choice DOES_NOT_CONTAIN other id', () => {
  const condition: LogicCondition = {
    comparison: ComparisonEnum.DOES_NOT_CONTAIN,
    expected: ['choice_b']
  }

  expect(
    validateCondition(singleChoiceField, condition, { [singleChoiceField.id]: singleValue })
  ).toBe(true)
})

test('multiple choice CONTAINS selected id', () => {
  const condition: LogicCondition = {
    comparison: ComparisonEnum.CONTAINS,
    expected: ['choice_a']
  }

  expect(
    validateCondition(multipleChoiceField, condition, { [multipleChoiceField.id]: multipleValue })
  ).toBe(true)
})

test('multiple choice CONTAINS missing id', () => {
  const condition: LogicCondition = {
    comparison: ComparisonEnum.CONTAINS,
    expected: ['choice_c']
  }

  expect(
    validateCondition(multipleChoiceField, condition, { [multipleChoiceField.id]: multipleValue })
  ).toBe(false)
})

test('single choice IS selected id', () => {
  const condition: LogicCondition = {
    comparison: ComparisonEnum.IS,
    expected: 'choice_a'
  }

  expect(
    validateCondition(singleChoiceField, condition, { [singleChoiceField.id]: singleValue })
  ).toBe(true)
})
