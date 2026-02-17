import type { FC } from 'react'

import { useTranslation } from '../utils'
import { helper } from '@voxly/utils'

import { FormField, RankingInput } from '../components'
import { useStore } from '../store'
import type { BlockProps } from './Block'
import { Block } from './Block'
import { Form } from './Form'

export const Ranking: FC<BlockProps> = ({ field, ...restProps }) => {
  const { state } = useStore()
  const { t } = useTranslation()

  function getValues(values: any) {
    return helper.isValid(values.input) ? values.input : undefined
  }

  return (
    <Block className="heyform-ranking" field={field} {...restProps}>
      <Form
        initialValues={{
          input: state.values[field.id]
        }}
        field={field}
        getValues={getValues}
      >
        <FormField
          name="input"
          rules={[
            {
              required: field.validations?.required,
              message: t('This field is required')
            }
          ]}
        >
          <RankingInput choices={field.properties?.choices} />
        </FormField>
      </Form>
    </Block>
  )
}
