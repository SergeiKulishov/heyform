import { FieldKindEnum } from '@voxly/shared-types-enums'
import { expect, test } from 'vitest'

import { fieldValuesToAnswers } from '../src'

const field = {
  id: 'URL',
  title: 'url.test',
  kind: FieldKindEnum.URL
}

test('correct value should be verified', () => {
  const answer = fieldValuesToAnswers(
    [
      {
        ...field,
        validations: { required: true }
      }
    ],
    {
      URL: 'https://www.google.com'
    }
  )

  expect(answer).toMatchSnapshot()
})

test('undefined value should be verified if not required', () => {
  const value = fieldValuesToAnswers(
    [
      {
        ...field,
        validations: { required: false }
      }
    ],
    {}
  )

  expect(value).toMatchSnapshot()
})

test('empty value should throw error', () => {
  expect(() => {
    fieldValuesToAnswers([field], {
      URL: ''
    })
  }).toThrow('Please enter a valid url')
})

test('invalid value should throw error', () => {
  expect(() => {
    fieldValuesToAnswers([field], {
      URL: '.google.com'
    })
  }).toThrow('Please enter a valid url')
})
