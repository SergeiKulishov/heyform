import { useRequest } from 'ahooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormService } from '@/services'
import { useParam } from '@/utils'
import { toFixed } from '@voxly/utils'

import { Select, Skeleton } from '@/components'

interface DropOffField {
  fieldId: string
  fieldTitle: string
  count: number
  percentage: number
}

const ANALYTIC_RANGES = [
  {
    label: 'form.analytics.7d',
    value: '7d'
  },
  {
    label: 'form.analytics.1m',
    value: '1m'
  },
  {
    label: 'form.analytics.3m',
    value: '3m'
  },
  {
    label: 'form.analytics.6m',
    value: '6m'
  },
  {
    label: 'form.analytics.1y',
    value: '1y'
  }
]

export default function FormAnalyticsFunnel() {
  const { t } = useTranslation()
  const { formId } = useParam()
  const [range, setRange] = useState('7d')

  const { loading, data } = useRequest(
    async () => {
      return FormService.funnelAnalytics(formId, range)
    },
    {
      refreshDeps: [formId, range]
    }
  )

  return (
    <div className="bg-foreground ring-accent-light mt-6 rounded-xl p-6 ring-1">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <h2 className="text-base/6 font-semibold">{t('form.analytics.funnel.title')}</h2>
        <Select
          className="w-full sm:w-56"
          value={range}
          options={ANALYTIC_RANGES}
          placeholder={t('form.analytics.7d')}
          disabled={loading}
          multiLanguage
          onChange={setRange}
        />
      </div>

      <div className="mt-6 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <div className="text-base/6 font-medium sm:text-sm/6">
            {t('form.analytics.funnel.opened')}
          </div>
          <Skeleton
            className="mt-3 h-8 [&_[data-slot=skeleton]]:h-[1.875rem] [&_[data-slot=skeleton]]:w-16 [&_[data-slot=skeleton]]:sm:h-6"
            loading={loading}
          >
            <div className="mt-3 text-3xl/8 font-semibold sm:text-2xl/8">
              {data?.totalViews ?? 0}
            </div>
          </Skeleton>
        </div>

        <div>
          <div className="text-base/6 font-medium sm:text-sm/6">
            {t('form.analytics.funnel.started')}
          </div>
          <Skeleton
            className="mt-3 h-8 [&_[data-slot=skeleton]]:h-[1.875rem] [&_[data-slot=skeleton]]:w-16 [&_[data-slot=skeleton]]:sm:h-6"
            loading={loading}
          >
            <div className="mt-3 text-3xl/8 font-semibold text-blue-600 sm:text-2xl/8">
              {`${toFixed(data?.startRate ?? 0)}% - ${data?.totalStarted ?? 0}`}
            </div>
          </Skeleton>
        </div>

        <div>
          <div className="text-base/6 font-medium sm:text-sm/6">
            {t('form.analytics.funnel.completed')}
          </div>
          <Skeleton
            className="mt-3 h-8 [&_[data-slot=skeleton]]:h-[1.875rem] [&_[data-slot=skeleton]]:w-16 [&_[data-slot=skeleton]]:sm:h-6"
            loading={loading}
          >
            <div className="mt-3 text-3xl/8 font-semibold text-green-600 sm:text-2xl/8">
              {`${toFixed(data?.completionRate ?? 0)}% - ${data?.totalCompleted ?? 0}`}
            </div>
          </Skeleton>
        </div>

        <div>
          <div className="text-base/6 font-medium sm:text-sm/6">
            {t('form.analytics.funnel.averageTime')}
          </div>
          <Skeleton
            className="mt-3 h-8 [&_[data-slot=skeleton]]:h-[1.875rem] [&_[data-slot=skeleton]]:w-16 [&_[data-slot=skeleton]]:sm:h-6"
            loading={loading}
          >
            <div className="mt-3 text-3xl/8 font-semibold sm:text-2xl/8">
              {`${data?.averageCompletionTime ?? 0} ${t('form.analytics.funnel.seconds')}`}
            </div>
          </Skeleton>
        </div>
      </div>

      {/* Drop-off by field */}
      <div className="mt-8">
        <h3 className="text-base/6 font-medium sm:text-sm/6">
          {t('form.analytics.funnel.dropOffByField')}
        </h3>

        <Skeleton className="mt-4 h-40" loading={loading}>
          {data?.dropOffByField && data.dropOffByField.length > 0 ? (
            <div className="mt-4 space-y-3">
              {data.dropOffByField.map((field: DropOffField, index: number) => (
                <div key={field.fieldId} className="relative">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary max-w-[60%] truncate">
                      {index + 1}. {field.fieldTitle}
                    </span>
                    <span className="font-medium">
                      {field.count} ({toFixed(field.percentage)}%)
                    </span>
                  </div>
                  <div className="bg-accent mt-1.5 h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min(field.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-secondary mt-4 py-8 text-center">
              {t('form.analytics.funnel.noDropOff')}
            </div>
          )}
        </Skeleton>
      </div>
    </div>
  )
}
