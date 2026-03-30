import { IconLoader2 } from '@tabler/icons-react'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormService } from '@/services'
import { useParam } from '@/utils'

import { Modal } from '@/components'
import { useModal } from '@/store'

interface NameValue {
  name: string
  value: number
}

interface StatsPeriod {
  browser: NameValue[]
  os: NameValue[]
  country: NameValue[]
  referrer: NameValue[]
  views: number[]
}

interface LinkStats {
  visitCount: number
  lastDay: StatsPeriod
  lastWeek: StatsPeriod
  lastMonth: StatsPeriod
}

type PeriodKey = 'lastDay' | 'lastWeek' | 'lastMonth'

const PERIOD_KEYS: PeriodKey[] = ['lastDay', 'lastWeek', 'lastMonth']

interface StatsTableProps {
  title: string
  items: NameValue[]
}

const StatsTable: FC<StatsTableProps> = ({ title, items }) => {
  if (items.length === 0) return null
  const total = items.reduce((sum, i) => sum + i.value, 0)

  return (
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="mt-1.5 space-y-1">
        {items.slice(0, 8).map(item => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="bg-primary/10 relative h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-primary absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-secondary w-28 truncate text-xs">{item.name || 'Unknown'}</span>
            <span className="text-secondary w-8 text-right text-xs">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface LinkStatsContentProps {
  linkId: string
  shortLink: string
}

const LinkStatsContent: FC<LinkStatsContentProps> = ({ linkId, shortLink }) => {
  const { t } = useTranslation()
  const { formId } = useParam()

  const [stats, setStats] = useState<LinkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<PeriodKey>('lastWeek')

  useEffect(() => {
    setLoading(true)
    setError(false)
    FormService.formLinkStats(linkId, formId)
      .then((result: any) => {
        setStats(result as LinkStats)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [linkId, formId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader2 className="text-secondary h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <p className="text-secondary py-8 text-center text-sm">
        {t('form.share.linkStats.loadFailed')}
      </p>
    )
  }

  const currentPeriod = stats[period]
  const hasAnyData =
    currentPeriod.browser.length > 0 ||
    currentPeriod.os.length > 0 ||
    currentPeriod.country.length > 0 ||
    currentPeriod.referrer.length > 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <a
            href={shortLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm font-medium hover:underline"
          >
            {shortLink}
          </a>
          <p className="text-secondary mt-0.5 text-2xl font-bold">
            {stats.visitCount}{' '}
            <span className="text-sm font-normal">{t('form.share.linkStats.totalClicks')}</span>
          </p>
        </div>
      </div>

      <div className="flex gap-1">
        {PERIOD_KEYS.map(key => (
          <button
            key={key}
            type="button"
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              period === key
                ? 'bg-primary text-primary-foreground'
                : 'text-secondary hover:bg-accent'
            }`}
            onClick={() => setPeriod(key)}
          >
            {t(`form.share.linkStats.${key}`)}
          </button>
        ))}
      </div>

      {currentPeriod.views.length > 0 && (
        <div>
          <h4 className="text-sm font-medium">{t('form.share.linkStats.clicksOverTime')}</h4>
          <div className="mt-2 flex items-end gap-px" style={{ height: 64 }}>
            {currentPeriod.views.map((count, i) => {
              const max = Math.max(...currentPeriod.views, 1)
              const height = (count / max) * 100
              return (
                <div
                  key={i}
                  className="bg-primary/70 hover:bg-primary flex-1 rounded-t transition-colors"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={String(count)}
                />
              )
            })}
          </div>
        </div>
      )}

      {hasAnyData ? (
        <div className="grid grid-cols-2 gap-4">
          <StatsTable title={t('form.share.linkStats.browsers')} items={currentPeriod.browser} />
          <StatsTable title={t('form.share.linkStats.os')} items={currentPeriod.os} />
          <StatsTable title={t('form.share.linkStats.countries')} items={currentPeriod.country} />
          <StatsTable title={t('form.share.linkStats.referrers')} items={currentPeriod.referrer} />
        </div>
      ) : (
        <p className="text-secondary py-4 text-center text-sm">
          {t('form.share.linkStats.noData')}
        </p>
      )}
    </div>
  )
}

export default function LinkStatsModal() {
  const { t } = useTranslation()
  const { isOpen, payload, onOpenChange } = useModal('LinkStatsModal')

  return (
    <Modal.Simple
      open={isOpen}
      title={t('form.share.linkStats.title')}
      contentProps={{
        className: 'max-w-lg'
      }}
      onOpenChange={onOpenChange}
    >
      {payload?.linkId && (
        <LinkStatsContent linkId={payload.linkId} shortLink={payload.shortLink} />
      )}
    </Modal.Simple>
  )
}
