import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import { flattenFieldsWithGroups } from '@voxly/form-renderer'
import { FieldKindEnum } from '@voxly/shared-types-enums'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { findBrokenNavigatePayloadIds } from '../utils'
import { htmlUtils } from '@voxly/answer-utils'

import { Button, Form, Modal } from '@/components'
import { useAppStore, useModal } from '@/store'

import { QuestionIcon } from '../LeftSidebar/QuestionList'
import { useStoreContext } from '../store'
import { PayloadForm } from './PayloadForm'
import { QuestionSelect } from './QuestionSelect'

const LogicComponent = () => {
  const { t } = useTranslation()

  const [rcForm] = Form.useForm()
  const { closeModal } = useAppStore()
  const { state, dispatch } = useStoreContext()
  const { fields, currentField, logics } = state

  const logic = useMemo(
    () => logics?.find(l => l.fieldId === currentField?.id),
    [currentField, logics]
  )

  const payloads = useMemo(() => logic?.payloads || [], [logic])
  const invalidPayloadIds = useMemo(
    () => findBrokenNavigatePayloadIds(fields, logic ? [logic] : []),
    [fields, logic]
  )

  const flatFields = useMemo(() => flattenFieldsWithGroups(state.fields), [state.fields])
  const currentIndex = useMemo(
    () => flatFields.findIndex(field => field.id === currentField?.id),
    [flatFields, currentField]
  )
  const nextField = currentIndex > -1 ? flatFields[currentIndex + 1] : undefined
  const targetFields = useMemo(
    () => (currentIndex > -1 ? flatFields.slice(currentIndex + 1) : []),
    [flatFields, currentIndex]
  )

  const [defaultNavigate, setDefaultNavigate] = useState(logic?.defaultNavigate?.fieldId)

  useEffect(() => {
    setDefaultNavigate(logic?.defaultNavigate?.fieldId)
  }, [logic])

  const fallbackText = useMemo(() => {
    if (defaultNavigate) {
      const field = flatFields.find(f => f.id === defaultNavigate)

      if (field) {
        return `${t('form.builder.logic.rule.fallbackElse')} ${htmlUtils.plain(field.title as string)}`
      }
    }

    if (!nextField) {
      return t('form.builder.logic.rule.fallbackSubmit')
    }
    return `${t('form.builder.logic.rule.fallbackNext')} ${htmlUtils.plain(nextField.title as string)}`
  }, [defaultNavigate, flatFields, nextField, t])

  const coverage = useMemo(() => {
    if (!currentField) {
      return null
    }

    const coverageKinds = [
      FieldKindEnum.MULTIPLE_CHOICE,
      FieldKindEnum.PICTURE_CHOICE,
      FieldKindEnum.YES_NO
    ]

    if (!coverageKinds.includes(currentField.kind)) {
      return null
    }

    const choices = currentField.properties?.choices || []
    const total = currentField.kind === FieldKindEnum.YES_NO ? 2 : choices.length

    if (total === 0) {
      return null
    }

    const choiceIds = new Set(choices.map(choice => choice.id))
    const coveredIds = new Set<string>()

    payloads.forEach(payload => {
      const conditions = payload.conditions?.length ? payload.conditions : [payload.condition]

      conditions.forEach(condition => {
        const comparison = condition?.comparison

        if (comparison !== 'is' && comparison !== 'contains') {
          return
        }

        const expected = condition?.expected
        const values = (Array.isArray(expected) ? expected : [expected]).filter(
          (value): value is string => typeof value === 'string'
        )

        values.forEach(value => {
          if (choiceIds.has(value)) {
            coveredIds.add(value)
          }
        })
      })
    })

    return {
      covered: coveredIds.size,
      total
    }
  }, [currentField, payloads])

  function handleClose() {
    closeModal('LogicModal')
  }

  function handleRemoveAll() {
    dispatch({
      type: 'deleteLogic',
      payload: {
        fieldId: state.currentField!.id
      }
    })
  }

  function handleSave() {
    rcForm.submit()
  }

  function handleFinish({ payloads }: AnyMap) {
    handleClose()
    dispatch({
      type: 'setLogic',
      payload: {
        fieldId: state.currentField!.id,
        payloads,
        ...(defaultNavigate ? { defaultNavigate: { fieldId: defaultNavigate } } : {})
      }
    })
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="border-accent-light border-b p-4">
        <h2 className="text-lg font-medium text-slate-900">
          {t('form.builder.logic.rule.headline')}
        </h2>

        {currentField && (
          <div className="mt-2 flex flex-1 items-center justify-between gap-x-2">
            <QuestionIcon
              kind={currentField.kind}
              index={currentField.index}
              parentIndex={currentField.parent?.index}
            />
            <div className="flex-1 truncate">{htmlUtils.plain(currentField.title as string)}</div>
          </div>
        )}
      </div>

      <div className="scrollbar h-[calc(70vh-10.35rem)] flex-1 space-y-4 p-4">
        <PayloadForm
          form={rcForm}
          fields={fields}
          currentField={currentField!}
          payloads={payloads}
          invalidPayloadIds={invalidPayloadIds}
          variables={state.variables}
          onFinish={handleFinish}
        />

        <div className="flex items-center gap-2">
          <div className="text-sm leading-10">{t('form.builder.logic.rule.otherwise')}</div>
          <div className="flex-1">
            <QuestionSelect
              fields={targetFields}
              value={defaultNavigate}
              placeholder="—"
              allowEmpty
              onChange={setDefaultNavigate}
            />
          </div>
        </div>

        <div className="text-secondary mt-4 rounded-md bg-black/5 p-3 text-sm">{fallbackText}</div>

        {coverage && (
          <div className="text-secondary mt-2 flex items-center gap-2 text-sm">
            {coverage.covered < coverage.total ? (
              <IconAlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <IconCircleCheck className="h-4 w-4 text-emerald-500" />
            )}
            <span>
              {t('form.builder.logic.rule.coverage', {
                covered: coverage.covered,
                total: coverage.total
              })}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 p-4">
        <Button.Link size="md" className="text-error" onClick={handleRemoveAll}>
          {t('form.builder.logic.rule.removeAll')}
        </Button.Link>

        <div className="flex items-center">
          <Button.Ghost size="md" onClick={handleClose}>
            {t('components.cancel')}
          </Button.Ghost>
          <Button className="ml-4" size="md" onClick={handleSave}>
            {t('components.saveChanges')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function LogicModal() {
  const { isOpen, onOpenChange } = useModal('LogicModal')

  return (
    <Modal
      open={isOpen}
      contentProps={{
        className: 'max-w-4xl p-0 overflow-hidden'
      }}
      onOpenChange={onOpenChange}
    >
      <LogicComponent />
    </Modal>
  )
}
