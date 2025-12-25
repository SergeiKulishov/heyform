import { IconPlus, IconTrash, IconUpload } from '@tabler/icons-react'
import { Kutt } from 'kutt'
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useParam } from '@/utils'

import { Button, Input, Modal, Switch, Tooltip } from '@/components'
import { useModal, useWorkspaceStore } from '@/store'

// Kutt URL shortener configuration
const KUTT_API_URL =
  import.meta.env.VITE_KUTT_API_URL || 'https://kutt-swww4os08c08g8wkskk0sgwo.stackbro.tech/api/v2'
const KUTT_API_KEY = import.meta.env.VITE_KUTT_API_KEY || ''

// Initialize Kutt client
const kutt = new Kutt()
kutt.set('api', KUTT_API_URL).set('key', KUTT_API_KEY)

async function shortenUrl(url: string): Promise<string> {
  try {
    const link = await kutt.links().create({ target: url })
    return link.link
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
  const { formId } = useParam()
  const { sharingURLPrefix } = useWorkspaceStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [parameters, setParameters] = useState<UrlParameter[]>([
    { id: crypto.randomUUID(), key: '', value: '' }
  ])
  const [useUrlShortener, setUseUrlShortener] = useState(false)
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null)
  const [isShortening, setIsShortening] = useState(false)

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

  // Shorten URL when toggle is enabled or URL changes
  useEffect(() => {
    if (useUrlShortener && generatedUrl) {
      setIsShortening(true)
      shortenUrl(generatedUrl)
        .then(shortened => {
          setShortenedUrl(shortened)
        })
        .finally(() => {
          setIsShortening(false)
        })
    } else {
      setShortenedUrl(null)
    }
  }, [useUrlShortener, generatedUrl])

  const displayUrl = useUrlShortener && shortenedUrl ? shortenedUrl : generatedUrl

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

  const handleCsvButtonClick = useCallback(() => {
    fileInputRef.current?.click()
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
          let generatedLink = `${baseUrl}?${searchParams.toString()}`

          // Shorten URL if toggle is enabled
          if (useUrlShortener) {
            generatedLink = await shortenUrl(generatedLink)
          }

          outputRows.push([...row, generatedLink])
        }

        // Create output CSV
        const outputHeaders = [...headers, 'generated_link']
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
        {parameters.map((param, index) => (
          <div key={param.id} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={t('form.share.generateLink.parameterKey')}
              value={param.key}
              onChange={(value: string) => handleKeyChange(param.id, value)}
            />
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
        <div className="border-input rounded-lg border bg-gray-50 p-3 dark:bg-gray-900">
          <p className="break-all text-sm">
            {isShortening ? t('form.share.generateLink.shortening') : displayUrl}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
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
              <div className="space-y-2">
                <p>{t('form.share.generateLink.fromCsvTooltip')}</p>
                <pre className="text-xs opacity-80">
                  {t('form.share.generateLink.fromCsvExample')}
                </pre>
              </div>
            }
            contentProps={{
              className: 'max-w-xs',
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
        <div className="flex items-center gap-x-4">
          <Button.Ghost size="sm" onClick={onClose}>
            {t('components.cancel')}
          </Button.Ghost>
          <Button.Copy size="sm" text={displayUrl} disabled={isShortening} />
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
