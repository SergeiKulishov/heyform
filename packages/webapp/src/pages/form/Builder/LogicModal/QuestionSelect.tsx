import { flattenFieldsWithGroups } from '@voxly/form-renderer'
import { type FC, useMemo } from 'react'

import { htmlUtils } from '@voxly/answer-utils'

import { Select } from '@/components'
import { FormFieldType } from '@/types'

import { QuestionIcon } from '../LeftSidebar/QuestionList'

const EMPTY_VALUE = '__empty__'

interface QuestionSelectProps {
  fields: FormFieldType[]
  value?: string
  placeholder?: string
  allowEmpty?: boolean
  onChange?: (value: string) => void
}

export const QuestionSelect: FC<QuestionSelectProps> = ({
  fields,
  value,
  placeholder,
  allowEmpty,
  onChange
}) => {
  const options = useMemo(() => {
    const list = flattenFieldsWithGroups(fields).map(row => ({
      value: row.id,
      label: (
        <div className="flex w-full items-center gap-x-2">
          <QuestionIcon kind={row.kind} index={row.index} parentIndex={row.parent?.index} />
          <span className="flex-1 truncate text-left">{htmlUtils.plain(row.title as string)}</span>
        </div>
      )
    }))

    if (allowEmpty) {
      return [
        {
          value: EMPTY_VALUE,
          label: placeholder || '—'
        },
        ...list
      ]
    }

    return list
  }, [fields, allowEmpty, placeholder])

  return (
    <Select
      options={options}
      value={value}
      placeholder={placeholder}
      onChange={v => onChange?.(v === EMPTY_VALUE ? '' : v)}
    />
  )
}
