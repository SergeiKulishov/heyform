import {
  IconAdjustmentsHorizontal,
  IconDownload,
  IconMaximize,
  IconMinimize,
  IconTrash
} from '@tabler/icons-react'
import {
  Answer,
  FieldKindEnum,
  FormField,
  QUESTION_FIELD_KINDS,
  SubmissionCategoryEnum
} from '@voxly/shared-types-enums'
import { useBoolean, useRequest } from 'ahooks'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SubmissionService } from '@/services'
import { cn, useParam } from '@/utils'
import { flattenFields } from '@voxly/answer-utils'

import IconMove from '@/assets/move.svg?react'
import {
  Button,
  EmptyState,
  Repeat,
  Select,
  Table,
  TableColumn,
  TableFetchParams,
  TableRef,
  TableState,
  Tooltip
} from '@/components'
import { useAppStore, useFormStore } from '@/store'
import { SubmissionType } from '@/types'

import SubmissionCell, { SubmissionHeaderCell } from './SubmissionCell'
import SubmissionDetailModal from './SubmissionDetailModal'

const SUBMISSION_CATEGORIES = [
  {
    label: 'form.submissions.inbox',
    value: 'inbox'
  },
  {
    label: 'form.submissions.spam',
    value: 'spam'
  },
  {
    label: 'form.submissions.partial',
    value: 'partial'
  }
]

export default function FormSubmissions() {
  const { t } = useTranslation()

  const { formId } = useParam()
  const { form } = useFormStore()
  const { openModal, closeModal } = useAppStore()

  const tableRef = useRef<TableRef<SubmissionType> | null>(null)

  const [category, setCategory] = useState<string>(SubmissionCategoryEnum.INBOX)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [isMaximized, { toggle }] = useBoolean(false)

  const targetCategory = useMemo(
    () =>
      category === SubmissionCategoryEnum.INBOX
        ? SubmissionCategoryEnum.SPAM
        : SubmissionCategoryEnum.INBOX,
    [category]
  )

  const { loading: deleteLoading, run: deleteRun } = useRequest(
    async () => {
      await SubmissionService.delete(formId, selectedRowKeys)
      await tableRef.current?.refresh()

      setSelectedRowKeys([])
    },
    {
      manual: true,
      refreshDeps: [formId, selectedRowKeys]
    }
  )

  const { loading: moveLoading, run: moveRun } = useRequest(
    async () => {
      await SubmissionService.updateCategory({
        formId,
        submissionIds: selectedRowKeys,
        category: targetCategory
      })
      await tableRef.current?.refresh()

      setSelectedRowKeys([])
    },
    {
      manual: true,
      refreshDeps: [formId, selectedRowKeys, targetCategory]
    }
  )

  const fields = useMemo(() => {
    const submitDateField = {
      id: FieldKindEnum.SUBMIT_DATE,
      kind: FieldKindEnum.SUBMIT_DATE,
      title: t('form.builder.question.submitDate')
    }

    const questionFields = flattenFields(form?.drafts || []).filter(row =>
      QUESTION_FIELD_KINDS.includes(row.kind)
    )

    const variables = (form?.variables || []).map(row => ({
      id: row.id,
      kind: FieldKindEnum.VARIABLE,
      title: row.name
    }))

    const hiddenFields = (form?.hiddenFields || []).map(row => ({
      id: row.id,
      kind: FieldKindEnum.HIDDEN_FIELDS,
      title: row.name
    }))

    return [submitDateField, ...questionFields, ...variables, ...hiddenFields] as FormField[]
  }, [form?.drafts, form?.hiddenFields, form?.variables, t])

  async function fetch({ current, pageSize }: TableFetchParams) {
    const isPartialCategory = category === 'partial'
    const { total, submissions } = await SubmissionService.submissions({
      formId,
      category: isPartialCategory ? undefined : category,
      isCompleted: isPartialCategory ? false : undefined,
      page: current,
      limit: pageSize
    })

    const list = submissions.map(row => ({
      ...row,
      answers: [
        ...row.answers,

        ...(row.variables || []).map(v => ({
          ...v,
          kind: FieldKindEnum.VARIABLE
        })),

        ...(row.hiddenFields || []).map(v => ({
          ...v,
          kind: FieldKindEnum.HIDDEN_FIELDS
        })),

        {
          id: FieldKindEnum.SUBMIT_DATE,
          kind: FieldKindEnum.SUBMIT_DATE,
          value: row.endAt || 0
        }
      ] as Answer[]
    }))

    return {
      total,
      list
    }
  }

  const columns: TableColumn<FormField, SubmissionType>[] = useMemo(
    () =>
      fields.map(row => ({
        field: row,
        headerRender: field => <SubmissionHeaderCell field={field} />,
        cellRender: (field, submission) => {
          const answer = submission.answers.find(answer => answer.id === field.id)

          if (!answer) {
            return <td />
          }

          return (
            <SubmissionCell field={field} submission={submission} answer={answer} isTableCell />
          )
        }
      })),
    [fields]
  )

  function handleToggle() {
    toggle()
  }

  function handleDownload() {
    window.open(`/api/export/submissions?formId=${formId}`)
  }

  function handleClose() {
    closeModal('SubmissionDetailModal')
    tableRef.current?.unexpand()
  }

  const handleExpandedChange = useCallback(
    (submission: SubmissionType, state: TableState) => {
      openModal('SubmissionDetailModal', {
        ...state,
        submission,
        fields,
        ref: tableRef.current
      })
    },
    [fields, openModal]
  )

  return (
    <>
      <div className={cn(isMaximized ? 'bg-foreground fixed inset-0 p-4' : 'mt-4')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2.5">
            <Select
              value={category}
              options={SUBMISSION_CATEGORIES}
              contentProps={{
                sideOffset: 8
              }}
              multiLanguage
              onChange={setCategory}
            />

            {selectedRowKeys.length > 0 && (
              <>
                <Tooltip
                  label={t('form.submissions.moveTo', {
                    name: t(`form.submissions.${targetCategory}`)
                  })}
                >
                  <Button.Ghost size="md" loading={moveLoading} iconOnly onClick={moveRun}>
                    <IconMove className="h-5 w-5" />
                  </Button.Ghost>
                </Tooltip>

                <Tooltip label={t('components.delete')}>
                  <Button.Ghost size="md" loading={deleteLoading} iconOnly onClick={deleteRun}>
                    <IconTrash className="h-5 w-5" />
                  </Button.Ghost>
                </Tooltip>
              </>
            )}
          </div>

          <div className="flex items-center gap-x-2.5">
            <Tooltip label={t('form.submissions.downloadCSV')}>
              <Button.Ghost size="md" iconOnly onClick={handleDownload}>
                <IconDownload className="h-5 w-5" />
              </Button.Ghost>
            </Tooltip>

            <Tooltip
              label={isMaximized ? t('form.submissions.minimize') : t('form.submissions.maximize')}
            >
              <Button.Ghost size="md" iconOnly onClick={handleToggle}>
                {isMaximized ? (
                  <IconMinimize className="h-5 w-5" />
                ) : (
                  <IconMaximize className="h-5 w-5" />
                )}
              </Button.Ghost>
            </Tooltip>

            <Button.Ghost size="md">
              <IconAdjustmentsHorizontal className="h-5 w-5" />
              <span className="hidden sm:block">{t('form.submissions.view')}</span>
            </Button.Ghost>
          </div>
        </div>

        <div className="mt-4">
          <Table
            ref={tableRef}
            classNames={{
              container: cn(
                'scrollbar overflow-auto rounded-md border border-accent text-sm',
                isMaximized ? 'h-[calc(100vh-9rem)]' : 'h-[calc(100vh-23.45rem)]'
              ),
              table:
                'min-w-full text-left [&_tbody_td]:max-w-60 [&_tbody_td]:h-10 [&_tbody_td]:px-4 [&_tbody_td]:text-left [&_tbody_td]:font-normal [&_thead_th]:truncate [&_thead_th]:max-w-60 [&_thead_th]:px-4 [&_thead_th]:h-10 [&_thead_th]:text-left [&_thead_th]:font-normal [&_thead_tr]:sticky [&_thead_tr]:top-0 [&_thead_tr]:bg-foreground [&_thead]:text-secondary',
              footer: 'text-sm justify-end'
            }}
            columns={columns}
            loader={
              <Repeat count={20}>
                <div className="border-accent flex h-10 items-center gap-x-8 border-b px-4">
                  <div className="skeleton h-4 w-4 rounded-md" />
                  <div className="skeleton h-4 w-20 rounded-md" />
                  <div className="skeleton h-4 w-60 rounded-md" />
                  <div className="skeleton h-4 w-80 rounded-md" />
                </div>
              </Repeat>
            }
            emptyRender={({ refresh }) => (
              <EmptyState
                className="flex h-[calc(100vh-26.5rem)] flex-col items-center justify-center"
                headline={t('form.submissions.headline')}
                subHeadline={t('form.submissions.subHeadline')}
                buttonTitle={t('components.refresh')}
                onClick={refresh}
              />
            )}
            fetch={fetch}
            refreshDeps={[formId, category]}
            selectedRowKeys={selectedRowKeys}
            onSelectionChange={setSelectedRowKeys}
            onExpandedChange={handleExpandedChange}
          />
        </div>
      </div>

      <SubmissionDetailModal onClose={handleClose} />
    </>
  )
}
