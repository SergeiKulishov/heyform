import {
  IconAlertTriangle,
  IconGripVertical,
  IconPlus,
  IconTrash,
  IconX
} from '@tabler/icons-react'
import {
  LogicAction,
  LogicCondition,
  LogicConnector,
  LogicPayload,
  Variable
} from '@voxly/shared-types-enums'
import { type FC, type ReactNode, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ReactSortable } from 'react-sortablejs'

import { getDefaultCondition, getLogicPayload } from '../utils'
import { validatePayload } from '@voxly/answer-utils'
import { excludeObject } from '@voxly/utils'

import { Button, Form, Select, Tooltip } from '@/components'
import { LOGIC_CONNECTORS } from '@/consts'
import { FormFieldType } from '@/types'

import Action from './Action'
import { ConditionFields } from './Condition'

interface PayloadFormProps {
  form: any
  fields: FormFieldType[]
  currentField: FormFieldType
  variables?: Variable[]
  payloads: LogicPayload[]
  invalidPayloadIds?: Set<string>
  onFinish?: (values: any) => void
}

interface PayloadItemProps {
  fields: FormFieldType[]
  variables?: Variable[]
  currentField?: FormFieldType
  value?: LogicPayload
  invalidPayloadIds?: Set<string>
  enableDrag?: boolean
  onDelete?: () => void
  onChange?: (value: LogicPayload) => void
}

const validator = async (rule: any, value: any) => {
  if (!validatePayload(value)) {
    throw new Error(rule.message as string)
  }
}

function getConditions(value?: LogicPayload): LogicCondition[] {
  if (value?.conditions && value.conditions.length > 0) {
    return value.conditions
  }
  return value?.condition ? [value.condition] : []
}

export const PayloadItem: FC<PayloadItemProps> = ({
  fields,
  variables = [],
  currentField,
  value,
  invalidPayloadIds,
  enableDrag,
  onDelete,
  onChange
}) => {
  const { t } = useTranslation()

  const conds = getConditions(value)

  function updateConditions(nextConds: LogicCondition[], connector?: LogicConnector) {
    if (nextConds.length === 1) {
      onChange?.({
        ...value,
        condition: nextConds[0],
        conditions: undefined,
        connector: undefined
      } as LogicPayload)
      return
    }

    onChange?.({
      ...value,
      condition: nextConds[0],
      conditions: nextConds,
      connector: connector || value?.connector || 'and'
    } as LogicPayload)
  }

  function handleConditionChange(index: number, condition: LogicCondition) {
    const nextConds = [...conds]
    nextConds[index] = condition
    updateConditions(nextConds, value?.connector)
  }

  function handleConnectorChange(connector: LogicConnector) {
    if ((value?.conditions?.length || 0) > 1) {
      onChange?.({ ...value, connector } as LogicPayload)
    }
  }

  function handleAddCondition() {
    const nextConds = [
      ...conds,
      getDefaultCondition(
        currentField?.kind,
        currentField?.properties?.choices,
        currentField?.properties?.allowMultiple
      )
    ]
    updateConditions(nextConds, value?.connector)
  }

  function handleRemoveCondition(index: number) {
    const nextConds = conds.filter((_, i) => i !== index)
    updateConditions(nextConds, value?.connector)
  }

  function handleActionChange(action: LogicAction) {
    onChange?.({ ...value, action } as LogicPayload)
  }

  function handleDelete() {
    onDelete?.()
  }

  return (
    <div className="payload-item" data-payload-id={value?.id}>
      <div className="payload-item-content">
        {enableDrag && (
          <IconGripVertical className="rule-drag-handle text-secondary h-5 w-5 cursor-grab" />
        )}
        <div className="flex-1 space-y-2">
          <div className="space-y-2">
            {conds.map((condition, index) => (
              <div key={index} className="flex items-center gap-2">
                {index === 0 ? (
                  <div className="text-sm leading-10">{t('form.builder.logic.rule.when')}</div>
                ) : (
                  <Select
                    className="w-20"
                    options={LOGIC_CONNECTORS}
                    value={value?.connector || 'and'}
                    multiLanguage
                    onChange={handleConnectorChange}
                  />
                )}
                <div className="flex-1">
                  <ConditionFields
                    field={currentField!}
                    value={condition}
                    onComparisonChange={comparison =>
                      handleConditionChange(index, { ...condition, comparison })
                    }
                    onExpectedChange={expected =>
                      handleConditionChange(index, { ...condition, expected } as LogicCondition)
                    }
                  />
                </div>
                {conds.length > 1 && (
                  <Tooltip label={t('form.builder.logic.rule.removeCondition')}>
                    <Button.Link
                      className="text-secondary hover:text-primary"
                      size="sm"
                      iconOnly
                      onClick={() => handleRemoveCondition(index)}
                    >
                      <IconX className="h-4 w-4" />
                    </Button.Link>
                  </Tooltip>
                )}
              </div>
            ))}
            <Button.Link size="sm" onClick={handleAddCondition}>
              <IconPlus className="h-4 w-4" />
              {t('form.builder.logic.rule.addCondition')}
            </Button.Link>
          </div>
          <Action
            fields={fields}
            currentField={currentField!}
            variables={variables}
            value={value?.action}
            onChange={handleActionChange}
          />
          {value?.id && invalidPayloadIds?.has(value.id) && (
            <div className="flex items-start gap-1.5 text-xs text-amber-600">
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>{t('form.builder.logic.rule.invalidTargetWarning')}</span>
            </div>
          )}
        </div>

        <Tooltip label={t('form.builder.logic.rule.deleteRule')}>
          <Button.Link
            className="text-secondary hover:text-primary"
            size="sm"
            iconOnly
            onClick={handleDelete}
          >
            <IconTrash className="h-5 w-5" />
          </Button.Link>
        </Tooltip>
      </div>
    </div>
  )
}

interface PayloadListProps extends PayloadItemProps {
  name: string
  className?: string
  children?: ReactNode
  form?: any
}

export const PayloadList: FC<PayloadListProps> = ({
  className,
  name,
  form,
  fields,
  variables = [],
  currentField,
  invalidPayloadIds,
  children
}) => {
  const { t } = useTranslation()

  return (
    <Form.List name={name}>
      {(listFields, { add, remove, move }) => {
        function handleAdd() {
          add(
            getLogicPayload(
              currentField?.kind,
              currentField?.properties?.choices,
              currentField?.properties?.allowMultiple
            )
          )
        }

        const ruleItems = listFields.map((listField, index) => {
          function handleDelete() {
            remove(index)
          }

          return (
            <Form.Item
              {...listField}
              key={listField.key}
              rules={[
                {
                  required: true,
                  validator,
                  message: t('form.builder.logic.rule.required')
                }
              ]}
            >
              {({ value, onChange }) => {
                return (
                  <PayloadItem
                    value={value}
                    fields={fields}
                    currentField={currentField}
                    variables={variables}
                    invalidPayloadIds={invalidPayloadIds}
                    enableDrag={!!form}
                    onDelete={handleDelete}
                    onChange={onChange}
                  />
                )
              }}
            </Form.Item>
          )
        })

        return (
          <div className={className}>
            {children}

            {listFields.length > 0 && (
              <>
                {form ? (
                  <ReactSortable
                    className="mb-4 space-y-6"
                    handle=".rule-drag-handle"
                    animation={200}
                    list={(form.getFieldValue(name) || []).map((p: any) =>
                      excludeObject(p, ['chosen', 'selected'])
                    )}
                    setList={() => {}}
                    onEnd={event => {
                      if (
                        event.oldIndex === undefined ||
                        event.newIndex === undefined ||
                        event.oldIndex === event.newIndex
                      ) {
                        return
                      }
                      move(event.oldIndex, event.newIndex)
                    }}
                  >
                    {ruleItems}
                  </ReactSortable>
                ) : (
                  <div className="mb-4 space-y-6">{ruleItems}</div>
                )}
                <div className="text-secondary text-xs">
                  {t('form.builder.logic.rule.orderHint')}
                </div>
              </>
            )}

            <Button.Ghost size="md" onClick={handleAdd}>
              <IconPlus className="text-secondary h-5 w-5" />
              {t('form.builder.logic.rule.addRule')}
            </Button.Ghost>
          </div>
        )
      }}
    </Form.List>
  )
}

export const PayloadForm: FC<PayloadFormProps> = ({
  form,
  fields,
  currentField,
  variables = [],
  payloads,
  invalidPayloadIds,
  onFinish
}) => {
  useEffect(() => {
    form.setFieldsValue({
      payloads
    })
  }, [currentField, payloads])

  return (
    <Form
      initialValues={{
        payloads
      }}
      form={form}
      onFinish={onFinish}
    >
      <PayloadList
        name="payloads"
        form={form}
        fields={fields}
        currentField={currentField}
        variables={variables}
        invalidPayloadIds={invalidPayloadIds}
      />
    </Form>
  )
}
