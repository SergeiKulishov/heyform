import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import { flattenFieldsWithGroups } from '@voxly/form-renderer'
import { Logic } from '@voxly/shared-types-enums'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  findBrokenNavigatePayloadIds,
  formatCyclePath,
  getChoiceCoverage,
  getNavigateTargetFields,
  hasCycleLogics
} from '../utils'
import { htmlUtils } from '@voxly/answer-utils'

import { Button, Form, Modal, useToast } from '@/components'
import { useAppStore, useModal } from '@/store'

import { QuestionIcon } from '../LeftSidebar/QuestionList'
import { useStoreContext } from '../store'
import { PayloadForm } from './PayloadForm'
import { QuestionSelect } from './QuestionSelect'

const LogicComponent = () => {
  const { t } = useTranslation()
  const toast = useToast()

  const [rcForm] = Form.useForm()
  const { closeModal } = useAppStore()
  const { state, dispatch } = useStoreContext()
  const { fields, currentField, logics } = state

  const logic = useMemo(
    () => logics?.find(l => l.fieldId === currentField?.id),
    [currentField, logics]
  )

  const payloads = useMemo(() => {
    const base = logic?.payloads || []
    const draft = state.draftPayload

    if (draft && draft.fieldId === currentField?.id && !base.some(p => p.id === draft.payload.id)) {
      return [...base, draft.payload]
    }

    return base
  }, [logic, state.draftPayload, currentField])
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
    () => getNavigateTargetFields(state.fields, currentField?.id),
    [state.fields, currentField]
  )

  const [defaultNavigate, setDefaultNavigate] = useState(logic?.defaultNavigate?.fieldId)

  useEffect(() => {
    setDefaultNavigate(logic?.defaultNavigate?.fieldId)
  }, [logic])

  useEffect(() => {
    const payloadId = state.focusPayloadId

    if (!payloadId) {
      return
    }

    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-payload-id="${payloadId}"]`)

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('payload-item-focused')
        setTimeout(() => el.classList.remove('payload-item-focused'), 2000)
      }

      dispatch({ type: 'clearFocusPayload' })
    }, 100)

    return () => clearTimeout(timer)
  }, [state.focusPayloadId, dispatch])

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

  const coverage = useMemo(
    () => (currentField ? getChoiceCoverage(currentField, payloads) : null),
    [currentField, payloads]
  )

  function handleClose() {
    dispatch({ type: 'clearDraftPayload' })
    dispatch({ type: 'clearFocusPayload' })
    closeModal('LogicModal')
  }

  function handleRemoveAll() {
    dispatch({
      type: 'deleteLogic',
      payload: {
        fieldId: state.currentField!.id
      }
    })
    dispatch({ type: 'clearDraftPayload' })
  }

  function handleSave() {
    rcForm.submit()
  }

  function handleFinish({ payloads }: AnyMap) {
    const fieldId = state.currentField!.id
    const logic: Logic = {
      fieldId,
      payloads,
      ...(defaultNavigate ? { defaultNavigate: { fieldId: defaultNavigate } } : {})
    } as Logic
    const nextLogics = [...(state.logics || []).filter(l => l.fieldId !== fieldId), logic]
    const cycle = hasCycleLogics(nextLogics, state.fields)

    if (cycle) {
      toast({
        title: t('form.builder.logic.rule.cycle.title'),
        message: t('form.builder.logic.rule.cycle.description', {
          path: formatCyclePath(cycle, state.fields)
        })
      })
      return
    }

    handleClose()
    dispatch({
      type: 'setLogic',
      payload: {
        fieldId,
        payloads,
        ...(defaultNavigate ? { defaultNavigate: { fieldId: defaultNavigate } } : {})
      }
    })
    dispatch({ type: 'clearDraftPayload' })
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
