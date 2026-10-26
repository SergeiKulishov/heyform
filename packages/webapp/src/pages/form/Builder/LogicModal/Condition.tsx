import {
  ComparisonEnum,
  FieldKindEnum,
  LogicCondition,
  OTHER_ITEM_ID,
  Variable
} from '@voxly/shared-types-enums'
import dayjs, { type Dayjs } from 'dayjs'
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getDefaultCondition, getVariableCondition } from '../utils'
import { htmlUtils } from '@voxly/answer-utils'
import { helper } from '@voxly/utils'

import { DatePicker, Input, Select } from '@/components'
import {
  DATE_CONDITIONS,
  DEFAULT_COMPARISONS,
  MULTIPLE_CHOICE_CONDITIONS,
  NUMBER_CONDITIONS,
  SINGLE_CHOICE_CONDITIONS,
  TEXT_CONDITIONS,
  TRUE_FALSE_CONDITIONS,
  VARIABLE_NUMBER_CONDITIONS
} from '@/consts'
import { FormFieldType } from '@/types'

interface ConditionFieldsProps {
  field: FormFieldType
  variables?: Variable[]
  value?: LogicCondition
  onComparisonChange: (value: any) => void
  onExpectedChange?: (value: any) => void
  onSubjectChange?: (fieldId?: string) => void
}

interface ConditionProps {
  field: FormFieldType
  variables?: Variable[]
  value?: LogicCondition
  onChange?: (value: LogicCondition) => void
}

interface DefaultProps {
  value?: any
  onComparisonChange: (value: any) => void
  onExpectedChange?: (value: any) => void
}

interface NumberConditionProps extends DefaultProps {
  options?: AnyMap[]
}

interface SubjectSelectProps {
  field: FormFieldType
  variables: Variable[]
  value?: LogicCondition
  onChange?: (fieldId?: string) => void
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

const StatementCondition: FC<DefaultProps> = ({ value, onComparisonChange }) => {
  const { t } = useTranslation()
  const handlerRef = useRef(onComparisonChange)
  handlerRef.current = onComparisonChange

  const comparison = value?.comparison
  const hasExpected = value ? (value as Any).expected !== undefined : false

  useEffect(() => {
    if (comparison !== ComparisonEnum.IS_EMPTY || hasExpected) {
      handlerRef.current({ comparison: ComparisonEnum.IS_EMPTY })
    }
  }, [comparison, hasExpected])

  return (
    <div className="text-secondary flex-1 text-sm leading-10">
      {t('form.builder.logic.rule.always')}
    </div>
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

const SubjectSelect: FC<SubjectSelectProps> = ({ field, variables, value, onChange }) => {
  const { t } = useTranslation()

  const options = useMemo(() => {
    const title = htmlUtils.plain((field.title as string) || '')

    return [
      {
        value: field.id,
        label: title || t('form.builder.logic.rule.subjectCurrentField')
      },
      ...variables.map(variable => ({
        value: variable.id,
        label: `${t('form.builder.logic.rule.subjectVariable')}: ${variable.name}`
      }))
    ]
  }, [field.id, field.title, variables, t])

  const subject = (value as AnyMap)?.fieldId || field.id

  return (
    <Select className="w-auto shrink-0" options={options} value={subject} onChange={onChange} />
  )
}

const NumberCondition: FC<NumberConditionProps> = ({
  value,
  options = NUMBER_CONDITIONS,
  onComparisonChange,
  onExpectedChange
}) => {
  return (
    <>
      <Select
        className="w-auto flex-1"
        options={options}
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
  variables = [],
  value,
  onComparisonChange,
  onExpectedChange,
  onSubjectChange
}) => {
  const subjectVariable = useMemo(
    () => variables.find(variable => variable.id === (value as AnyMap)?.fieldId),
    [variables, value]
  )

  const subjectField = useMemo<FormFieldType>(() => {
    if (!subjectVariable) {
      return field
    }

    return {
      id: subjectVariable.id,
      title: subjectVariable.name,
      kind: subjectVariable.kind === 'number' ? FieldKindEnum.NUMBER : FieldKindEnum.SHORT_TEXT
    } as FormFieldType
  }, [field, subjectVariable])

  const Element = useMemo(() => {
    switch (subjectField.kind) {
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
            options={
              subjectVariable?.kind === 'number' ? VARIABLE_NUMBER_CONDITIONS : NUMBER_CONDITIONS
            }
            onComparisonChange={onComparisonChange}
            onExpectedChange={onExpectedChange}
          />
        )

      case FieldKindEnum.STATEMENT:
        return <StatementCondition value={value} onComparisonChange={onComparisonChange} />

      default:
        return <DefaultCondition value={value} onComparisonChange={onComparisonChange} />
    }
  }, [subjectField, subjectVariable, field, onComparisonChange, onExpectedChange, value])

  return (
    <div className="flex flex-1 items-center gap-2">
      {variables.length > 0 && (
        <SubjectSelect
          field={field}
          variables={variables}
          value={value}
          onChange={onSubjectChange}
        />
      )}
      {Element}
    </div>
  )
}

export default function Condition({
  field,
  variables = [],
  value: rawValue,
  onChange
}: ConditionProps) {
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

  const handleSubjectChange = useCallback(
    (fieldId?: string) => {
      const variable = fieldId ? variables.find(variable => variable.id === fieldId) : undefined

      if (variable) {
        handleChange(getVariableCondition(variable))

        return
      }

      handleChange(
        getDefaultCondition(field.kind, field.properties?.choices, field.properties?.allowMultiple)
      )
    },
    [field, handleChange, variables]
  )

  return (
    <div className="rule-condition">
      <div className="text-sm leading-10">{t('form.builder.logic.rule.when')}</div>
      <ConditionFields
        field={field}
        variables={variables}
        value={value}
        onComparisonChange={handleComparisonChange}
        onExpectedChange={handleExpectedChange}
        onSubjectChange={handleSubjectChange}
      />
    </div>
  )
}
