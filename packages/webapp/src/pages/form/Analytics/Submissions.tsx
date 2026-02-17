import { Choice, Column, FieldKindEnum } from '@voxly/shared-types-enums'
import { useBoolean } from 'ahooks'
import { FC, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SubmissionService } from '@/services'
import { timeFromNow, useParam } from '@/utils'
import { helper } from '@voxly/utils'

import { Pagination, useToast } from '@/components'

interface SubmissionItemProps {
  answers: AnyMap[]
}

interface InputTableItemProps extends SubmissionItemProps {
  columns: Column[]
}

const InputTableItem: FC<InputTableItemProps> = ({ columns, answers: rawAnswers = [] }) => {
  const { i18n } = useTranslation()
  const answers = useMemo(
    () =>
      rawAnswers
        .map(a =>
          (a.value || []).map((value: AnyMap) => ({
            value,
            endAt: a.endAt
          }))
        )
        .flat(),
    [rawAnswers]
  )

  return (
    <table className="w-full">
      <thead>
        <tr>
          {columns.map(c => (
            <th
              key={c.id}
              className="heyform-report-border text-secondary border-b py-2 text-sm/6 font-medium"
            >
              {c.label}
            </th>
          ))}
          <th className="heyform-report-border border-b"></th>
        </tr>
      </thead>

      <tbody className="heyform-report-divide divide-y">
        {answers.map((row: any, index: number) => (
          <tr key={index}>
            {columns.map(c => (
              <td key={c.id} className="heyform-report-input-value">
                {row.value[c.id]}
              </td>
            ))}
            <td className="heyform-report-input-datetime">
              {timeFromNow(row.endAt, i18n.language)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface MatrixItemProps extends SubmissionItemProps {
  rows: Choice[]
  columns: Choice[]
}

const MatrixAnalyticsItem: FC<MatrixItemProps> = ({ rows, columns, answers: rawAnswers = [] }) => {
  const { i18n } = useTranslation()

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className="heyform-report-border text-secondary border-b py-2 text-sm/6 font-medium" />
          {columns.map(c => (
            <th
              key={c.id}
              className="heyform-report-border text-secondary border-b py-2 text-center text-sm/6 font-medium"
            >
              {c.label}
            </th>
          ))}
          <th className="heyform-report-border border-b" />
        </tr>
      </thead>
      <tbody className="heyform-report-divide divide-y">
        {rawAnswers.map((answer: any, answerIndex: number) => {
          const value = answer.value || {}

          return rows.map((row, rowIndex) => {
            const selected = value[row.id]
            const selectedIds = Array.isArray(selected) ? selected : selected ? [selected] : []
            const isGroupStart = answerIndex > 0 && rowIndex === 0

            return (
              <tr
                key={`${answerIndex}-${row.id}`}
                style={
                  isGroupStart
                    ? {
                        borderTopWidth: '2px',
                        borderTopColor: 'var(--heyform-report-question-a60)'
                      }
                    : undefined
                }
              >
                <td className="heyform-report-input-value font-medium">{row.label}</td>
                {columns.map(c => (
                  <td key={c.id} className="heyform-report-input-value text-center">
                    {selectedIds.includes(c.id) ? '●' : ''}
                  </td>
                ))}
                <td className="heyform-report-input-datetime">
                  {rowIndex === 0 ? timeFromNow(answer.endAt, i18n.language) : ''}
                </td>
              </tr>
            )
          })
        })}
      </tbody>
    </table>
  )
}

const AnswerValue: FC<{ answer: AnyMap }> = ({ answer }) => {
  const { t } = useTranslation()

  switch (answer.kind) {
    case FieldKindEnum.ADDRESS:
      return (
        answer.value &&
        `${answer.value.address1}, ${answer.value.address2} ${answer.value.city}, ${answer.value.state}, ${answer.value.zip}`
      )

    case FieldKindEnum.FULL_NAME:
      return answer.value && `${answer.value.firstName} ${answer.value.lastName}`

    case FieldKindEnum.DATE_RANGE:
      return answer.value && [answer.value.start, answer.value.end].filter(Boolean).join(' - ')

    case FieldKindEnum.FILE_UPLOAD:
      return <div>{answer.value?.filename}</div>

    case FieldKindEnum.SIGNATURE:
      return <div>{t('form.builder.question.signature')}</div>

    default:
      return answer.value
  }
}

const SubmissionItem: FC<SubmissionItemProps> = ({ answers = [] }) => {
  const { i18n } = useTranslation()

  return (
    <div className="heyform-report-divide divide-y">
      {answers.map(row => (
        <div className="heyform-report-answer" key={row.submissionId}>
          <div className="heyform-report-value">
            <AnswerValue answer={row} />
          </div>
          <div className="heyform-report-datetime">{timeFromNow(row.endAt, i18n.language)}</div>
        </div>
      ))}
    </div>
  )
}

export default function FormReportSubmissions({ response }: any) {
  const { t } = useTranslation()

  const toast = useToast()
  const { formId } = useParam()

  const [page, setPage] = useState(1)
  const [loading, { setTrue, setFalse }] = useBoolean(false)
  const [answers, setAnswers] = useState<AnyMap[]>(response.answers || [])
  const [total, setTotal] = useState(response.count)

  const handleChange = useCallback(
    async (newPage: number) => {
      setTrue()

      try {
        const result = await SubmissionService.answers({
          formId,
          fieldId: response.id,
          page: newPage
        })
        const { total, answers } = result

        setAnswers(answers)
        setTotal(total)
        setPage(newPage)
      } catch (err: any) {
        toast({
          title: t('components.error.title'),
          message: err.message
        })
      }

      setFalse()
    },
    [formId, response.id, setFalse, setTrue, t, toast]
  )

  if (!helper.isValidArray(response.answers)) {
    return null
  }

  return (
    <div>
      {response.kind === FieldKindEnum.INPUT_TABLE ? (
        <InputTableItem answers={answers} columns={response.properties?.tableColumns || []} />
      ) : response.kind === FieldKindEnum.MATRIX || response.kind === 'matrix' ? (
        <MatrixAnalyticsItem
          answers={answers}
          rows={response.properties?.rows || []}
          columns={response.properties?.matrixColumns || []}
        />
      ) : (
        <SubmissionItem answers={answers} />
      )}

      {total > 10 && (
        <Pagination
          className="heyform-report-pagination"
          total={total}
          page={page}
          pageSize={10}
          buttonProps={{
            size: 'sm'
          }}
          loading={loading}
          onChange={handleChange}
        />
      )}
    </div>
  )
}
