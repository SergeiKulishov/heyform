import {
  IconChartBar,
  IconCopy,
  IconExternalLink,
  IconRefresh,
  IconTrash
} from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import { useTranslation } from 'react-i18next'

import { FormService } from '@/services'
import { useParam } from '@/utils'

import { Badge, Button, Tooltip, useToast } from '@/components'
import { useAppStore } from '@/store'

interface FormLink {
  id: string
  shortLink: string
  target: string
  source: string
  visitCount: number
  createdAt: string
}

interface FormLinksListProps {
  onRefreshRef?: (fn: () => void) => void
}

export default function FormLinksList({ onRefreshRef }: FormLinksListProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { formId } = useParam()
  const { openModal } = useAppStore()

  const [links, setLinks] = useState<FormLink[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const result = await FormService.formLinks(formId)
      setLinks((result as FormLink[]) ?? [])
      setLoaded(true)
    } catch {
      toast({ title: t('form.share.links.loadFailed') })
    } finally {
      setLoading(false)
    }
  }, [formId, toast, t])

  if (!loaded && !loading) {
    fetchLinks()
  }

  if (onRefreshRef) {
    onRefreshRef(fetchLinks)
  }

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t('form.share.links.deleteConfirm'))) return
      setDeletingId(id)
      try {
        await FormService.deleteFormLink(id, formId)
        setLinks(prev => prev.filter(l => l.id !== id))
        toast({ title: t('form.share.links.deleteSuccess') })
      } catch {
        toast({ title: t('form.share.links.deleteFailed') })
      } finally {
        setDeletingId(null)
      }
    },
    [formId, toast, t]
  )

  const handleCopy = useCallback((id: string) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return iso
    }
  }

  return (
    <section id="shortened-links">
      <div className="flex items-center justify-between">
        <h2 className="text-base/6 font-semibold">{t('form.share.links.headline')}</h2>
        <Tooltip label={t('form.share.links.refresh')}>
          <div>
            <Button.Link size="sm" iconOnly onClick={fetchLinks} loading={loading}>
              <IconRefresh className="h-4 w-4" />
            </Button.Link>
          </div>
        </Tooltip>
      </div>

      <div className="mt-4">
        {loading && links.length === 0 ? (
          <p className="text-secondary text-sm">{t('form.share.links.loading')}</p>
        ) : links.length === 0 ? (
          <p className="text-secondary text-sm">{t('form.share.links.empty')}</p>
        ) : (
          <div className="space-y-2">
            {links.map(link => (
              <div
                key={link.id}
                className="border-input flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={link.shortLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary truncate text-sm font-medium hover:underline"
                    >
                      {link.shortLink}
                    </a>
                    <IconExternalLink className="text-secondary h-3.5 w-3.5 flex-shrink-0" />
                  </div>
                  <p className="text-secondary truncate text-xs">{link.target}</p>
                  <div className="flex items-center gap-3 pt-0.5">
                    <Badge className="text-xs capitalize">{link.source}</Badge>
                    <span className="text-secondary text-xs">
                      {t('form.share.links.clicks', { count: link.visitCount })}
                    </span>
                    <span className="text-secondary text-xs">{formatDate(link.createdAt)}</span>
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  <Tooltip label={t('form.share.links.stats')}>
                    <div>
                      <Button.Link
                        size="sm"
                        iconOnly
                        onClick={() =>
                          openModal('LinkStatsModal', {
                            linkId: link.id,
                            shortLink: link.shortLink
                          })
                        }
                      >
                        <IconChartBar className="h-4 w-4" />
                      </Button.Link>
                    </div>
                  </Tooltip>
                  <CopyToClipboard text={link.shortLink} onCopy={() => handleCopy(link.id)}>
                    <Tooltip
                      label={
                        copiedId === link.id ? t('form.share.links.copied') : t('components.copy')
                      }
                    >
                      <div>
                        <Button.Link size="sm" iconOnly>
                          <IconCopy className="h-4 w-4" />
                        </Button.Link>
                      </div>
                    </Tooltip>
                  </CopyToClipboard>
                  <Tooltip label={t('form.share.links.delete')}>
                    <div>
                      <Button.Link
                        size="sm"
                        iconOnly
                        className="text-error hover:bg-error/10"
                        loading={deletingId === link.id}
                        onClick={() => handleDelete(link.id)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button.Link>
                    </div>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
