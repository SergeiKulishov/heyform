import { CHOICE_FIELD_KINDS, RATING_FIELD_KINDS } from '@voxly/shared-types-enums'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { helper, toFixed } from '@voxly/utils'

import { useFormStore } from '@/store'

import FormReportSubmissions from './Submissions'

interface FormReportItemProps {
  index: number
  response: any
  isHideFieldEnabled?: boolean
}

interface ChoicesProps {
  chooses: any[]
}

interface RatingsProps extends ChoicesProps {
  length: number
}

const Choices: FC<ChoicesProps> = ({ chooses }) => {
  const { t } = useTranslation()
  const total = useMemo(() => chooses.reduce((prev, next) => prev + next.count, 0) || 1, [chooses])

  return (
    <div className="heyform-report-chart">
      {chooses.map((row, index) => {
        const percent = `${toFixed((row.count * 100) / total)}%`

        return (
          <div key={index} className="heyform-report-chart-item">
            <div
              className="heyform-report-chart-background"
              style={{
                width: percent
              }}
            />
            <div className="heyform-report-chart-content">
              <span className="heyform-report-chart-percent">
                {row.label} · {percent}
              </span>
              <span className="heyform-report-chart-count">
                {t('form.analytics.report.submission', { count: row.count })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const Ratings: FC<RatingsProps> = ({ length, chooses }) => {
  const { t } = useTranslation()
  const arrays = Array.from<number>({ length }).map((_, index) => index + 1)
  const total = chooses.filter(c => helper.isNumeric(c)).reduce((prev, next) => prev + next, 0)

  return (
    <div className="heyform-report-chart">
      {arrays.map((row, index) => {
        const count = chooses[row] || 0
        const percent = `${toFixed((count * 100) / total)}%`

        return (
          <div key={index} className="heyform-report-chart-item">
            <div
              className="heyform-report-chart-background"
              style={{
                width: percent
              }}
            />
            <div className="heyform-report-chart-content">
              <span className="heyform-report-chart-percent">
                {row} · {total > 0 ? Math.round((count * 100) / total) : 0}%
              </span>
              <span className="heyform-report-chart-count">
                {t('form.analytics.report.submission', { count })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const FormReportItem: FC<FormReportItemProps> = ({ index, response, isHideFieldEnabled }) => {
  const { t } = useTranslation()

  const { form } = useFormStore()

  const isChoices = useMemo(() => CHOICE_FIELD_KINDS.includes(response.kind), [response.kind])
  const isRating = useMemo(() => RATING_FIELD_KINDS.includes(response.kind), [response.kind])

  const isHided = useMemo(
    () => isHideFieldEnabled && form?.customReport?.hiddenFields?.includes(response.id),
    [form?.customReport?.hiddenFields, isHideFieldEnabled, response.id]
  )

  const children = useMemo(() => {
    if (isChoices) {
      return <Choices chooses={response.chooses} />
    } else if (isRating) {
      return <Ratings length={response.properties?.total} chooses={response.chooses} />
    } else {
      return <FormReportSubmissions response={response} />
    }
  }, [isChoices, isRating, response])

  return (
    <li className="heyform-report-item">
      <div className="flex gap-4">
        <div className="heyform-report-question flex-1">
          {index}. {response.title}
        </div>
      </div>
      <div className="heyform-report-meta">
        {isRating
          ? t('form.analytics.report.submission2', {
              count: response.count,
              average: response.average
            })
          : t('form.analytics.report.submission', { count: response.count })}
      </div>

      {!isHided && <div className="heyform-report-content">{children}</div>}
    </li>
  )
}

const Skeleton = () => {
  return (
    <div>
      <div className="py-[0.3125rem]">
        <div className="skeleton h-3.5 w-72 rounded-sm"></div>
      </div>
      <div className="py-[0.3125rem]">
        <div className="skeleton h-3.5 w-24 rounded-sm"></div>
      </div>
    </div>
  )
}

export default Object.assign(FormReportItem, {
  Skeleton
})
