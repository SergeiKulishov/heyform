import { IconCheck, IconCopy, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react'
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import { useTranslation } from 'react-i18next'

import { ShortenUrlService } from '@/services'
import { useParam } from '@/utils'

import { Button, Input, Modal, Switch, Tooltip, useToast } from '@/components'
import { useFormStore, useModal, useWorkspaceStore } from '@/store'

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

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n')
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  })
}

function generateCSV(headers: string[], rows: string[][]): string {
  const escapeField = (field: string) => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }

  const headerLine = headers.map(escapeField).join(',')
  const dataLines = rows.map(row => row.map(escapeField).join(','))

  return [headerLine, ...dataLines].join('\n')
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

  const baseUrl = useMemo(() => `${sharingURLPrefix}/form/${formId}`, [formId, sharingURLPrefix])

  const generatedUrl = useMemo(() => {
    const validParams = parameters.filter(p => p.key.trim() !== '')
    if (validParams.length === 0) return baseUrl

    const searchParams = new URLSearchParams()
    validParams.forEach(p => {
      if (p.key.trim()) {
        searchParams.append(p.key.trim(), p.value.trim())
      }
    })

    return `${baseUrl}?${searchParams.toString()}`
  }, [baseUrl, parameters])

  const displayUrl = shortenedUrl || generatedUrl

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

  const handleCsvFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async e => {
        const text = e.target?.result as string
        if (!text) return

        const rows = parseCSV(text)
        if (rows.length < 2) return // Need at least header + 1 data row

        const headers = rows[0]
        const dataRows = rows.slice(1)

        // Generate links for each row
        const outputRows: string[][] = []
        for (const row of dataRows) {
          const searchParams = new URLSearchParams()
          headers.forEach((header, index) => {
            if (header && row[index] !== undefined) {
              searchParams.append(header, row[index])
            }
          })
          const generatedLink = `${baseUrl}?${searchParams.toString()}`
          let shortenedLink = ''

          // Shorten URL if toggle is enabled
          if (useUrlShortener) {
            try {
              shortenedLink = await shortenUrl(generatedLink)
            } catch (error: any) {
              console.error('Error shortening URL:', error)
              toast({
                title: t('form.share.generateLink.shorteningFailed'),
                message:
                  error.response?.data?.message ||
                  error.message ||
                  t('form.share.generateLink.shorteningFailedMessage')
              })
              // shortenedLink stays empty if shortening fails
            }
          }

          // Add columns based on toggle state
          if (useUrlShortener) {
            outputRows.push([...row, generatedLink, shortenedLink])
          } else {
            outputRows.push([...row, generatedLink])
          }
        }

        // Create output CSV
        const outputHeaders = useUrlShortener
          ? [...headers, 'generated_link', 'shortened_link']
          : [...headers, 'generated_link']
        const csvContent = generateCSV(outputHeaders, outputRows)

        // Download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `generated_links_${formId}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
      reader.readAsText(file)
    },
    [baseUrl, formId, useUrlShortener]
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
