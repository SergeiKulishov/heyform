import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiTokenService, ApiTokenType } from '@/services'
import { formatDay, useParam } from '@/utils'

import { Async, Badge, Button, EmptyState, Repeat, useAlert, useToast } from '@/components'
import { useAppStore } from '@/store'

export default function WorkspaceApiTokens() {
  const { t, i18n } = useTranslation()

  const { workspaceId } = useParam()
  const { openModal } = useAppStore()
  const toast = useToast()
  const alert = useAlert()

  const [tokens, setTokens] = useState<ApiTokenType[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  async function fetch() {
    const data = await ApiTokenService.apiTokens(workspaceId)
    setTokens(data)
    return data.length > 0
  }

  function handleRevoke(token: ApiTokenType) {
    alert({
      title: t('settings.apiTokens.revokeConfirm', {
        name: token.name
      }),
      cancelProps: {
        label: t('components.cancel')
      },
      confirmProps: {
        label: t('settings.apiTokens.revoke'),
        className: 'bg-error hover:bg-error text-primary-light dark:text-primary'
      },
      fetch: async () => {
        await ApiTokenService.revoke(workspaceId, token.id)
        setRefreshKey(prev => prev + 1)
        toast({
          title: t('settings.apiTokens.revokeSuccess')
        })
      }
    })
  }

  function formatDate(value?: string) {
    if (!value) {
      return t('settings.apiTokens.never')
    }

    return formatDay(dayjs(value), i18n.language)
  }

  return (
    <section id="apiTokens" className="border-accent-light border-b py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('settings.apiTokens.title')}</h2>
          <p className="text-secondary mt-1 text-sm">{t('settings.apiTokens.description')}</p>
        </div>

        <Button size="md" onClick={() => openModal('ApiTokenModal')}>
          {t('settings.apiTokens.createToken')}
        </Button>
      </div>

      <div className="border-primary/10 mt-6 overflow-hidden rounded-lg border">
        <div className="-mx-6 overflow-x-auto whitespace-nowrap lg:-mx-10">
          <div className="inline-block min-w-full align-middle sm:px-10">
            <table className="min-w-full text-left text-sm/6">
              <thead className="text-secondary">
                <tr>
                  <th className="border-b-accent-light border-b px-4 py-2 font-medium sm:first:pl-1 sm:last:pr-1">
                    {t('settings.apiTokens.name')}
                  </th>
                  <th className="border-b-accent-light border-b px-4 py-2 font-medium sm:first:pl-1 sm:last:pr-1">
                    {t('settings.apiTokens.prefix')}
                  </th>
                  <th className="border-b-accent-light border-b px-4 py-2 font-medium sm:first:pl-1 sm:last:pr-1">
                    {t('settings.apiTokens.scope')}
                  </th>
                  <th className="border-b-accent-light border-b px-4 py-2 font-medium sm:first:pl-1 sm:last:pr-1">
                    {t('settings.apiTokens.lastUsedAt')}
                  </th>
                  <th className="border-b-accent-light border-b px-4 py-2 font-medium sm:first:pl-1 sm:last:pr-1">
                    {t('settings.apiTokens.createdAt')}
                  </th>
                  <th className="border-b-accent-light border-b px-4 py-2 font-medium sm:first:pl-1 sm:last:pr-1"></th>
                </tr>
              </thead>

              <tbody>
                <Async
                  fetch={fetch}
                  refreshDeps={[workspaceId, refreshKey]}
                  loader={
                    <Repeat count={3}>
                      <ApiTokenSkeleton />
                    </Repeat>
                  }
                  emptyRender={() => (
                    <tr>
                      <td colSpan={6}>
                        <div className="py-10">
                          <EmptyState headline={t('settings.apiTokens.empty')} />
                        </div>
                      </td>
                    </tr>
                  )}
                >
                  {tokens.map(token => (
                    <tr key={token.id} className="hover:bg-primary/[2.5%]">
                      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
                        {token.name}
                      </td>
                      <td className="border-accent border-b px-4 py-3 font-mono sm:first:pl-1 sm:last:pr-1">
                        {token.prefix}
                      </td>
                      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
                        <Badge
                          color={token.scope === 'read_write' ? 'amber' : 'green'}
                          className="capitalize"
                        >
                          {token.scope === 'read_write'
                            ? t('settings.apiTokens.scopeReadWrite')
                            : t('settings.apiTokens.scopeRead')}
                        </Badge>
                      </td>
                      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
                        {formatDate(token.lastUsedAt)}
                      </td>
                      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
                        {formatDate(token.createdAt)}
                      </td>
                      <td className="border-accent border-b px-4 py-3 text-right sm:first:pl-1 sm:last:pr-1">
                        <Button.Link
                          size="sm"
                          className="text-error hover:text-error"
                          onClick={() => handleRevoke(token)}
                        >
                          {t('settings.apiTokens.revoke')}
                        </Button.Link>
                      </td>
                    </tr>
                  ))}
                </Async>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function ApiTokenSkeleton() {
  return (
    <tr>
      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
        <div className="skeleton h-4 w-28 rounded-sm"></div>
      </td>
      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
        <div className="skeleton h-4 w-20 rounded-sm"></div>
      </td>
      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
        <div className="skeleton h-4 w-16 rounded-sm"></div>
      </td>
      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
        <div className="skeleton h-4 w-24 rounded-sm"></div>
      </td>
      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1">
        <div className="skeleton h-4 w-24 rounded-sm"></div>
      </td>
      <td className="border-accent border-b px-4 py-3 sm:first:pl-1 sm:last:pr-1"></td>
    </tr>
  )
}
