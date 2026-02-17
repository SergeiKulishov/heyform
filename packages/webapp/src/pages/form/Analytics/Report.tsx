import { CHOICES_FIELD_KINDS, FieldKindEnum, QUESTION_FIELD_KINDS } from '@voxly/shared-types-enums'
import { FC, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormService } from '@/services'
import { useParam } from '@/utils'
import { flattenFields, htmlUtils } from '@voxly/answer-utils'
import { helper, pickValidValues } from '@voxly/utils'

import { Async, Repeat } from '@/components'
import { useFormStore } from '@/store'

import FormReportItem from './ReportItem'

interface ReportListProps {
  isHideFieldEnabled?: boolean
}

export const ReportList: FC<ReportListProps> = ({ isHideFieldEnabled }) => {
  const { t } = useTranslation()

  const { formId } = useParam()
  const { form } = useFormStore()

  const [responses, setResponses] = useState<any[]>([])

  const fetch = useCallback(async () => {
    const result = await FormService.report(formId)

    const fields = flattenFields(form?.drafts).filter(field =>
      QUESTION_FIELD_KINDS.includes(field.kind)
    )

    if (helper.isValidArray(fields)) {
      const choiceKinds = [FieldKindEnum.YES_NO, ...CHOICES_FIELD_KINDS]

      const responses = fields!.map(field => {
        let row = result.responses.find((row: any) => row.id === field.id)

        if (row) {
          row.answers = result.submissions.find((row: any) => row._id === field.id)?.answers

          if (choiceKinds.includes(field.kind)) {
            row.chooses = field.properties?.choices?.map(choice => {
              const choose = row.chooses.find((row: any) => row.id === choice.id)

              return {
                ...choose,
                ...choice
              }
            })
          }

          if (helper.isEmpty(row.chooses)) {
            row.chooses = []
          }
        } else {
          row = {
            id: field.id,
            chooses: [],
            total: 0,
            count: 0,
            average: 0
          }
        }

        row.title = helper.isArray(field.title)
          ? htmlUtils.plain(htmlUtils.serialize(field.title as any))
          : field.title
        row.kind = field.kind
        row.properties = pickValidValues((field.properties as any) || {}, [
          'tableColumns',
          'rows',
          'matrixColumns',
          'total',
          'average',
          'leftLabel',
          'rightLabel'
        ])

        return row
      })

      setResponses(responses)
      return responses.length > 0
    }

    return false
  }, [form?.drafts, formId])

  return (
    <Async
      fetch={fetch}
      loader={
        <div className="mt-4 space-y-6">
          <Repeat count={3}>
            <FormReportItem.Skeleton />
          </Repeat>
        </div>
      }
      refreshDeps={[form?.drafts, formId]}
    >
      {isHideFieldEnabled && (
        <>
          <h2 className="heyform-report-heading">{form?.name}</h2>
          <p className="heyform-report-subheading">
            {t('form.customReport.metadata', { count: form?.submissionCount || 0 })}
          </p>
        </>
      )}

      <ol className="heyform-report-items mt-4 space-y-8">
        {responses.map((row, index) => (
          <FormReportItem
            key={index}
            index={index + 1}
            response={row}
            isHideFieldEnabled={isHideFieldEnabled}
          />
        ))}
      </ol>
    </Async>
  )
}

export default function FormAnalyticsReport() {
  const { t } = useTranslation()

  return (
    <div className="bg-foreground ring-accent-light mt-6 rounded-xl p-6 ring-1">
      <div className="flex items-center justify-between">
        <h2 className="text-base/6 font-semibold">{t('form.analytics.report.headline')}</h2>
      </div>

      <div className="heyform-report">
        <ReportList />
      </div>
    </div>
  )
}
