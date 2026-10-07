import { FieldKindEnum, LogicCondition, OTHER_ITEM_ID } from '@voxly/shared-types-enums'
import dayjs, { type Dayjs } from 'dayjs'
import { type FC, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { helper } from '@voxly/utils'

import { DatePicker, Input, Select } from '@/components'
import {
  DATE_CONDITIONS,
  DEFAULT_COMPARISONS,
  MULTIPLE_CHOICE_CONDITIONS,
  NUMBER_CONDITIONS,
  SINGLE_CHOICE_CONDITIONS,
  TEXT_CONDITIONS,
  TRUE_FALSE_CONDITIONS
} from '@/consts'
import { FormFieldType } from '@/types'

interface ConditionFieldsProps {
  field: FormFieldType
  value?: LogicCondition
  onComparisonChange: (value: any) => void
  onExpectedChange?: (value: any) => void
}

interface ConditionProps {
  field: FormFieldType
  value?: LogicCondition
  onChange?: (value: LogicCondition) => void
}

interface DefaultProps {
  value?: any
  onComparisonChange: (value: any) => void
  onExpectedChange?: (value: any) => void
}

const DefaultCondition: FC<DefaultProps> = ({ value, onComparisonChange }) => {
  return (
    <Select
      className="w-auto flex-1"
      options={DEFAULT_COMPARISONS}
      value={value?.comparison}
      multiLanguage
      onChange={onComparisonChange}
    />
  )
}

const TextCondition: FC<DefaultProps> = ({ value, onComparisonChange, onExpectedChange }) => {
  return (
    <>
      <Select
        className="w-auto flex-1"
        options={TEXT_CONDITIONS}
        value={value?.comparison}
        multiLanguage
        onChange={onComparisonChange}
      />
      <Input
        className="flex-1"
        value={(value as Any).expected}
        placeholder="Value"
        onChange={onExpectedChange}
      />
    </>
  )
}

const SingleChoiceCondition: FC<DefaultProps & { field: FormFieldType }> = ({
  value,
  field,
  onComparisonChange,
  onExpectedChange
}) => {
  return (
    <>
      <Select
        className="w-auto flex-1"
        options={SINGLE_CHOICE_CONDITIONS}
        value={value?.comparison}
        multiLanguage
        onChange={onComparisonChange}
      />
      <Select
        className="flex-1"
        options={(field.properties?.choices || []) as AnyMap[]}
        valueKey="id"
        value={value?.expected}
        onChange={onExpectedChange}
      />
    </>
  )
}

const MultipleChoiceCondition: FC<DefaultProps & { field: FormFieldType }> = ({
  value,
  field,
  onComparisonChange,
  onExpectedChange
}) => {
  const { t } = useTranslation()

  const options = useMemo(() => {
    if (!field.properties?.allowMultiple) {
      return MULTIPLE_CHOICE_CONDITIONS.filter(
        option => option.value !== 'contains' && option.value !== 'does_not_contain'
      )
    }
    return MULTIPLE_CHOICE_CONDITIONS
  }, [field.properties?.allowMultiple])

  const expectedOptions = useMemo(() => {
    const list: AnyMap[] = [...(field.properties?.choices || [])]

    if (field.properties?.allowOther) {
      list.push({
        id: OTHER_ITEM_ID,
        label: field.properties?.otherChoiceLabel || t('form.builder.compose.otherChoice')
      })
    }

    return list
  }, [
    field.properties?.allowOther,
    field.properties?.choices,
    field.properties?.otherChoiceLabel,
    t
  ])

  const MemoSelect = useMemo(() => {
    if (field.properties?.allowMultiple && SINGLE_CHOICE_CONDITIONS.includes(value?.comparison)) {
      const currValue = helper.isArray(value?.expected)
        ? value?.expected
        : [value?.expected].filter(helper.isValid)

      return (
        <Select.Multi
          className="flex-1"
          options={expectedOptions}
          valueKey="id"
          value={currValue}
          onChange={onExpectedChange}
        />
      )
    }

    const currValue = helper.isValidArray(value?.expected) ? value!.expected[0] : value?.expected

    return (
      <Select
        className="flex-1"
        options={expectedOptions}
        valueKey="id"
        value={currValue}
        onChange={onExpectedChange}
      />
    )
  }, [expectedOptions, field.properties?.allowMultiple, onExpectedChange, value])

  return (
    <>
      <Select
        className="w-auto flex-1"
        options={options}
        value={value?.comparison}
        multiLanguage
        onChange={onComparisonChange}
      />
      {MemoSelect}
    </>
  )
}

const BoolCondition: FC<DefaultProps> = ({ value, onComparisonChange, onExpectedChange }) => {
  return (
    <>
      <Select
        className="w-auto flex-1"
        options={SINGLE_CHOICE_CONDITIONS}
        value={value?.comparison}
        multiLanguage
        onChange={onComparisonChange}
      />
      <Select
        className="flex-1"
        type="boolean"
        options={TRUE_FALSE_CONDITIONS}
        value={value?.expected}
        multiLanguage
        onChange={onExpectedChange}
      />
    </>
  )
}

const DateCondition: FC<DefaultProps & { field: FormFieldType }> = ({
  value,
  field,
  onComparisonChange,
  onExpectedChange
}) => {
  const { t } = useTranslation()
  const allowTime = field.properties?.allowTime
  const expectedFormat = `YYYY-MM-DD${allowTime ? ' HH:mm' : ''}`
  const dateValue = useMemo(() => {
    const expected = (value as Any)?.expected
    if (!expected) {
      return undefined
    }
    const parsed = dayjs(expected, expectedFormat)
    return parsed.isValid() ? parsed : undefined
  }, [(value as Any)?.expected, expectedFormat])

  function handleChange(date: Dayjs | null) {
    onExpectedChange?.(date ? dayjs(date).format(expectedFormat) : undefined)
  }

  return (
    <>
      <Select
        className="w-auto flex-1"
        options={DATE_CONDITIONS}
        value={value?.comparison}
        multiLanguage
        onChange={onComparisonChange}
      />
      <DatePicker
        className="flex-1"
        showTimeSelect={allowTime}
        placeholder={t('form.builder.logic.rule.dateValue')}
        value={dateValue}
        onChange={handleChange}
      />
    </>
  )
}

const NumberCondition: FC<DefaultProps> = ({ value, onComparisonChange, onExpectedChange }) => {
  return (
    <>
      <Select
        className="w-auto flex-1"
        options={NUMBER_CONDITIONS}
        value={value?.comparison}
        multiLanguage
        onChange={onComparisonChange}
      />
      <Input
        className="flex-1"
        type="number"
        value={(value as Any).expected}
        placeholder="Value"
        onChange={onExpectedChange}
      />
    </>
  )
}

export const ConditionFields: FC<ConditionFieldsProps> = ({
  field,
  value,
  onComparisonChange,
  onExpectedChange
}) => {
  const Element = useMemo(() => {
    switch (field.kind) {
      case FieldKindEnum.SHORT_TEXT:
      case FieldKindEnum.LONG_TEXT:
      case FieldKindEnum.EMAIL:
      case FieldKindEnum.PHONE_NUMBER:
      case FieldKindEnum.URL:
        return (
          <TextCondition
            value={value}
            onComparisonChange={onComparisonChange}
            onExpectedChange={onExpectedChange}
          />
        )

      case FieldKindEnum.YES_NO:
        return (
          <SingleChoiceCondition
            field={field}
            value={value}
            onComparisonChange={onComparisonChange}
            onExpectedChange={onExpectedChange}
          />
        )

      case FieldKindEnum.LEGAL_TERMS:
        return (
          <BoolCondition
            value={value}
            onComparisonChange={onComparisonChange}
            onExpectedChange={onExpectedChange}
          />
        )

      case FieldKindEnum.MULTIPLE_CHOICE:
      case FieldKindEnum.PICTURE_CHOICE:
        return (
          <MultipleChoiceCondition
            field={field}
            value={value}
            onComparisonChange={onComparisonChange}
            onExpectedChange={onExpectedChange}
          />
        )

      case FieldKindEnum.DATE:
        return (
          <DateCondition
            field={field}
            value={value}
            onComparisonChange={onComparisonChange}
            onExpectedChange={onExpectedChange}
          />
        )

      case FieldKindEnum.NUMBER:
      case FieldKindEnum.RATING:
      case FieldKindEnum.OPINION_SCALE:
        return (
          <NumberCondition
            value={value}
            onComparisonChange={onComparisonChange}
            onExpectedChange={onExpectedChange}
          />
        )

      default:
        return <DefaultCondition value={value} onComparisonChange={onComparisonChange} />
    }
  }, [field, onComparisonChange, onExpectedChange, value])

  return <>{Element}</>
}

export default function Condition({ field, value: rawValue, onChange }: ConditionProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState<LogicCondition>(rawValue!)

  const handleChange = useCallback(
    (newValue: any) => {
      setValue(newValue)
      onChange?.(newValue)
    },
    [onChange]
  )

  const handleComparisonChange = useCallback(
    (comparison: any) => {
      handleChange({ ...value, comparison })
    },
    [handleChange, value]
  )

  const handleExpectedChange = useCallback(
    (expected: any) => {
      handleChange({ ...value, expected })
    },
    [handleChange, value]
  )

  return (
    <div className="rule-condition">
      <div className="text-sm leading-10">{t('form.builder.logic.rule.when')}</div>
      <ConditionFields
        field={field}
        value={value}
        onComparisonChange={handleComparisonChange}
        onExpectedChange={handleExpectedChange}
      />
    </div>
  )
}
