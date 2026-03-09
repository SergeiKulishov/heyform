import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX
} from '@tabler/icons-react'
import axios from 'axios'
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import { useTranslation } from 'react-i18next'

import { ShortenUrlService } from '@/services'
import { useParam } from '@/utils'

import { Button, Input, Modal, Switch, Tooltip, useToast } from '@/components'
import { useCsvJobStore, useFormStore, useModal, useWorkspaceStore } from '@/store'

async function shortenUrl(url: string): Promise<string> {
  try {
    return await ShortenUrlService.shorten(url)
  } catch (error) {
    console.error('Failed to shorten URL:', error)
    return url // Return original URL on error
  }
}

interface UrlParameter {
  id: string
  key: string
  value: string
}

interface GenerateLinkComponentProps {
  onClose: () => void
}

const GenerateLinkComponent: FC<GenerateLinkComponentProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const toast = useToast()
  const { formId } = useParam()
  const { sharingURLPrefix } = useWorkspaceStore()
  const { form } = useFormStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get hidden field names for autocomplete
  const hiddenFieldNames = useMemo(
    () => (form?.hiddenFields || []).map(field => field.name),
    [form?.hiddenFields]
  )

  const [parameters, setParameters] = useState<UrlParameter[]>([
    { id: crypto.randomUUID(), key: '', value: '' }
  ])
  const [useUrlShortener, setUseUrlShortener] = useState(false)
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null)
  const [isShortening, setIsShortening] = useState(false)
  const [copiedOriginal, setCopiedOriginal] = useState(false)
  const [copiedShortened, setCopiedShortened] = useState(false)
  const [notifiedStatuses, setNotifiedStatuses] = useState<Set<string>>(new Set())

  // Используем глобальный store для CSV задач
  const { jobs, addJob, removeJob } = useCsvJobStore()

  // Получаем ВСЕ задачи для этой формы (сортируем по времени создания - новые сверху)
  const csvJobs = useMemo(() => {
    const jobsArray = Array.from(jobs.values())
    return jobsArray.filter(job => job.formId === formId)
  }, [jobs, formId])

  const baseUrl = useMemo(() => `${sharingURLPrefix}/form/${formId}`, [formId, sharingURLPrefix])

  const generatedUrl = useMemo(() => {
    const searchParams = new URLSearchParams()

    const validParams = parameters.filter(p => p.key.trim() !== '')
    validParams.forEach(p => {
      if (p.key.trim()) {
        searchParams.append(p.key.trim(), p.value.trim())
      }
    })

    const queryString = searchParams.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }, [baseUrl, parameters])

  // Clear shortened URL when toggle is disabled
  useEffect(() => {
    if (!useUrlShortener) {
      setShortenedUrl(null)
    }
  }, [useUrlShortener])

  // Clear shortened URL when parameters change
  useEffect(() => {
    setShortenedUrl(null)
  }, [generatedUrl])

  const handleAddParameter = useCallback(() => {
    setParameters(prev => [...prev, { id: crypto.randomUUID(), key: '', value: '' }])
  }, [])

  const handleRemoveParameter = useCallback((id: string) => {
    setParameters(prev => prev.filter(p => p.id !== id))
  }, [])

  const handleKeyChange = useCallback((id: string, key: string) => {
    setParameters(prev => prev.map(p => (p.id === id ? { ...p, key } : p)))
  }, [])

  const handleValueChange = useCallback((id: string, value: string) => {
    setParameters(prev => prev.map(p => (p.id === id ? { ...p, value } : p)))
  }, [])

  const handleShortenUrl = useCallback(async () => {
    setIsShortening(true)
    try {
      const shortened = await shortenUrl(generatedUrl)
      setShortenedUrl(shortened)
    } catch (error: any) {
      console.error('Error shortening URL:', error)
      toast({
        title: t('form.share.generateLink.shorteningFailed'),
        message:
          error.response?.data?.message ||
          error.message ||
          t('form.share.generateLink.shorteningFailedMessage')
      })
    } finally {
      setIsShortening(false)
    }
  }, [generatedUrl, toast, t])

  const handleCsvButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleCopyOriginal = useCallback(() => {
    setCopiedOriginal(true)
    setTimeout(() => setCopiedOriginal(false), 2000)
  }, [])

  const handleCopyShortened = useCallback(() => {
    setCopiedShortened(true)
    setTimeout(() => setCopiedShortened(false), 2000)
  }, [])

  // Показываем уведомления при изменении статуса задач (только один раз для каждой)
  useEffect(() => {
    csvJobs.forEach(job => {
      const statusKey = `${job.jobId}-${job.status}`

      // Проверяем, показывали ли мы уже уведомление для этого статуса
      if (notifiedStatuses.has(statusKey)) return

      if (job.status === 'completed') {
        toast({
          title: t('form.share.generateLink.processingComplete'),
          message: t('form.share.generateLink.readyToDownload')
        })
        setNotifiedStatuses(prev => new Set(prev).add(statusKey))
      } else if (job.status === 'failed') {
        toast({
          title: t('form.share.generateLink.processingFailed'),
          message: t('form.share.generateLink.unknownError')
        })
        setNotifiedStatuses(prev => new Set(prev).add(statusKey))
      }
    })
  }, [csvJobs, notifiedStatuses, toast, t])

  const handleDownloadCsv = useCallback((jobId: string) => {
    window.open(`/api/csv-shorten-job/${jobId}/download`, '_blank')
  }, [])

  const handleCancelJob = useCallback(
    async (jobId: string) => {
      try {
        await axios.post(`/api/csv-shorten-job/${jobId}/cancel`)
        removeJob(jobId)
        toast({ title: t('form.share.generateLink.jobCancelled') })
      } catch (error: any) {
        console.error('Failed to cancel job:', error)
      }
    },
    [removeJob, toast, t]
  )

  const handleRemoveJob = useCallback(
    (jobId: string) => {
      removeJob(jobId)
    },
    [removeJob]
  )

  const handleCsvFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)
      formData.append('formId', formId)
      formData.append('baseUrl', baseUrl)
      formData.append('useUrlShortener', String(useUrlShortener))

      try {
        const response = await axios.post('/api/csv-shorten-job', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        // Добавляем задачу в глобальный store
        addJob({
          jobId: response.data.jobId,
          status: 'pending',
          progress: 0,
          totalRows: 0,
          processedRows: 0,
          failedRows: 0,
          formId,
          fileName: file.name
        })

        toast({
          title: t('form.share.generateLink.processingStarted'),
          message: t('form.share.generateLink.willNotifyWhenReady')
        })
      } catch (error: any) {
        console.error('Failed to upload CSV:', error)
        toast({
          title: t('form.share.generateLink.uploadFailed'),
          message: error.response?.data?.message || error.message
        })
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [formId, baseUrl, useUrlShortener, addJob, toast, t]
  )

  return (
    <div className="space-y-6">
      {/* Parameters list */}
      <div className="space-y-3">
        {parameters.map((param, _) => (
          <div key={param.id} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={t('form.share.generateLink.parameterKey')}
              value={param.key}
              onChange={(value: string) => handleKeyChange(param.id, value)}
              list={hiddenFieldNames.length > 0 ? `hidden-fields-datalist-${param.id}` : undefined}
            />
            {/* Datalist for autocomplete - only render if hidden fields exist */}
            {hiddenFieldNames.length > 0 && (
              <datalist id={`hidden-fields-datalist-${param.id}`}>
                {hiddenFieldNames.map((name, index) => (
                  <option key={index} value={name} />
                ))}
              </datalist>
            )}
            <Input
              className="flex-1"
              placeholder={t('form.share.generateLink.parameterValue')}
              value={param.value}
              onChange={(value: string) => handleValueChange(param.id, value)}
            />
            {parameters.length > 1 && (
              <Button.Link
                size="sm"
                iconOnly
                className="text-error hover:bg-error/10"
                onClick={() => handleRemoveParameter(param.id)}
              >
                <IconTrash className="h-4 w-4" />
              </Button.Link>
            )}
          </div>
        ))}
      </div>

      {/* Add parameter button */}
      <Button.Link size="sm" className="gap-x-1" onClick={handleAddParameter}>
        <IconPlus className="h-4 w-4" />
        {t('form.share.generateLink.addParameter')}
      </Button.Link>

      {/* Generated URL preview */}
      <div className="space-y-2">
        <label className="text-secondary text-sm font-medium">
          {t('form.share.generateLink.preview')}
        </label>

        {/* Original URL - always shown */}
        <div className="border-input flex items-start justify-between gap-3 rounded-lg border bg-gray-50 p-3 dark:bg-gray-900">
          <div className="min-w-0 flex-1">
            <p className="text-secondary mb-1 text-xs">
              {t('form.share.generateLink.originalUrl')}
            </p>
            <p className="break-all text-sm">{generatedUrl}</p>

            {/* Shorten button - only when toggle is enabled and not yet shortened */}
            {useUrlShortener && !shortenedUrl && (
              <Button.Ghost
                size="sm"
                className="mt-2"
                onClick={handleShortenUrl}
                loading={isShortening}
              >
                {t('form.share.generateLink.shortenButton')}
              </Button.Ghost>
            )}
          </div>

          {/* Copy button */}
          <CopyToClipboard text={generatedUrl} onCopy={handleCopyOriginal}>
            <button
              type="button"
              className="text-secondary hover:text-primary flex-shrink-0 transition-colors"
            >
              {copiedOriginal ? (
                <IconCheck className="h-5 w-5" />
              ) : (
                <IconCopy className="h-5 w-5" />
              )}
            </button>
          </CopyToClipboard>
        </div>

        {/* Shortened URL - only shown after shortening */}
        {useUrlShortener && shortenedUrl && (
          <div className="border-input flex items-start justify-between gap-3 rounded-lg border bg-gray-50 p-3 dark:bg-gray-900">
            <div className="min-w-0 flex-1">
              <p className="text-secondary mb-1 text-xs">
                {t('form.share.generateLink.shortenedUrl')}
              </p>
              <p className="break-all text-sm">{shortenedUrl}</p>
            </div>

            {/* Copy button */}
            <CopyToClipboard text={shortenedUrl} onCopy={handleCopyShortened}>
              <button
                type="button"
                className="text-secondary hover:text-primary flex-shrink-0 transition-colors"
              >
                {copiedShortened ? (
                  <IconCheck className="h-5 w-5" />
                ) : (
                  <IconCopy className="h-5 w-5" />
                )}
              </button>
            </CopyToClipboard>
          </div>
        )}
      </div>

      {/* CSV Jobs Status - показываем все задачи */}
      {csvJobs.length > 0 && (
        <div className="space-y-3">
          {csvJobs.map(job => (
            <div key={job.jobId} className="border-input rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t('form.share.generateLink.processingCsv', { fileName: job.fileName })}
                  {job.status === 'completed' && (
                    <span className="ml-2 text-xs text-green-600">✓</span>
                  )}
                  {job.status === 'failed' && <span className="ml-2 text-xs text-red-500">✗</span>}
                </span>
                <div className="flex items-center gap-1">
                  {/* Cancel button - only for active jobs */}
                  {job.status !== 'completed' && job.status !== 'failed' && (
                    <Button.Ghost size="sm" onClick={() => handleCancelJob(job.jobId)}>
                      <IconX className="h-4 w-4" />
                    </Button.Ghost>
                  )}
                  {/* Remove button - for completed/failed jobs */}
                  {(job.status === 'completed' || job.status === 'failed') && (
                    <Button.Ghost
                      size="sm"
                      className="text-secondary hover:text-error"
                      onClick={() => handleRemoveJob(job.jobId)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button.Ghost>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="bg-muted mb-2 h-2 overflow-hidden rounded-full">
                <div
                  className={`h-full transition-all duration-300 ${
                    job.status === 'failed' ? 'bg-red-500' : 'bg-primary'
                  }`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>

              <div className="text-secondary flex items-center justify-between text-xs">
                <span>
                  {job.processedRows} / {job.totalRows} {t('form.share.generateLink.rowsProcessed')}
                </span>
                {job.failedRows > 0 && (
                  <span className="text-red-500">
                    {job.failedRows} {t('form.share.generateLink.failed')}
                  </span>
                )}
              </div>

              {job.status === 'completed' && (
                <Button className="mt-3 w-full" onClick={() => handleDownloadCsv(job.jobId)}>
                  <IconDownload className="mr-2 h-4 w-4" />
                  {t('form.share.generateLink.downloadCsv')}
                </Button>
              )}

              {job.status === 'failed' && (
                <p className="mt-2 text-xs text-red-500">
                  {t('form.share.generateLink.unknownError')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* First row: CSV upload and toggle */}
        <div className="flex items-center gap-x-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvFileChange}
          />
          <Tooltip
            label={
              <div className="whitespace-pre-line text-sm">
                {t('form.share.generateLink.fromCsvTooltip')}
              </div>
            }
            contentProps={{
              className: 'max-w-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
              side: 'top'
            }}
          >
            <div>
              <Button.Ghost size="sm" className="gap-x-1" onClick={handleCsvButtonClick}>
                <IconUpload className="h-4 w-4" />
                {t('form.share.generateLink.fromCsv')}
              </Button.Ghost>
            </div>
          </Tooltip>

          <div className="flex items-center gap-x-2">
            <Switch value={useUrlShortener} onChange={setUseUrlShortener} />
            <span className="text-secondary text-sm">
              {t('form.share.generateLink.useUrlShortener')}
            </span>
          </div>
        </div>

        {/* Second row: Cancel button */}
        <div className="flex items-center justify-end gap-x-4">
          <Button.Ghost size="sm" onClick={onClose}>
            {t('components.cancel')}
          </Button.Ghost>
        </div>
      </div>
    </div>
  )
}

export default function GenerateLinkModal() {
  const { t } = useTranslation()
  const { isOpen, onOpenChange } = useModal('GenerateLinkModal')

  return (
    <Modal.Simple
      open={isOpen}
      title={t('form.share.generateLink.title')}
      contentProps={{
        className: 'max-w-lg'
      }}
      onOpenChange={onOpenChange}
    >
      <GenerateLinkComponent onClose={() => onOpenChange(false)} />
    </Modal.Simple>
  )
}
