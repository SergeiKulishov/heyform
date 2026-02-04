import { FormRenderer, insertWebFont } from '@heyform-inc/form-renderer'
import { IconChevronLeft, IconTrash, IconUpload } from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { insertThemeStyle } from '@/pages/form/Builder/utils'
import { FormService } from '@/services'
import { cn, useParam, useRouter } from '@/utils'

import { Async, Button, Loader, Tabs, useAlert, useToast } from '@/components'
import { useAppStore } from '@/store'
import { TemplateType } from '@/types'

export interface TemplatesModelProps {
  onBack: () => void
}

interface TemplatePreviewProps extends TemplatesModelProps {
  template: TemplateType
}

const TemplatePreview: FC<TemplatePreviewProps> = ({ template: rawTemplate, onBack }) => {
  const { t, i18n } = useTranslation()

  const router = useRouter()
  const { workspaceId, projectId } = useParam()
  const { closeModal } = useAppStore()

  const [platform, setPlatform] = useState('mobile')
  const [template, setTemplate] = useState<TemplateType>()

  const tabs = useMemo(
    () => [
      {
        value: 'desktop',
        label: t('form.builder.preview.desktop')
      },
      {
        value: 'mobile',
        label: t('form.builder.preview.mobile')
      }
    ],
    [t]
  )

  const { loading, run } = useRequest(
    async () => {
      const formId = await FormService.useTemplate({
        projectId,
        templateId: rawTemplate.id,
        recordId: rawTemplate.recordId as string
      })

      closeModal('CreateFormModal')
      router.push(`/workspace/${workspaceId}/project/${projectId}/form/${formId}/create`)
    },
    {
      refreshDeps: [rawTemplate.id],
      manual: true
    }
  )

  async function fetch() {
    const result = await FormService.templateDetail(rawTemplate.id)

    setTemplate({
      ...rawTemplate,
      ...result,
      settings: {
        active: true,
        removeBranding: true
      }
    })

    return true
  }

  useEffect(() => {
    insertWebFont(template?.themeSettings?.theme?.fontFamily)
    insertThemeStyle(template?.themeSettings?.theme)
  }, [template?.themeSettings?.theme])

  return (
    <div className="h-[calc(90vh-3.125rem)] w-[90vw]">
      <div className="flex h-full w-full flex-col">
        <div className="relative flex w-full items-center justify-between pb-4 pr-8">
          <button
            type="button"
            className="-ml-[0.15rem] inline-flex items-center gap-1 text-sm/6"
            onClick={onBack}
          >
            <IconChevronLeft className="h-5 w-5" />
            <span className="font-semibold">{rawTemplate.name}</span>
          </button>

          <Tabs.SegmentedControl
            className="absolute left-1/2 hidden -translate-x-1/2 sm:flex [&_[data-slot=nav]]:h-9 [&_[data-slot=tablist]_button]:whitespace-nowrap [&_[data-slot=tablist]_button]:px-4 [&_[data-slot=tablist]_button]:py-0.5"
            tabs={tabs}
            defaultTab={platform}
            onChange={setPlatform}
          />

          <Button size="md" loading={loading} onClick={run}>
            {t('form.template.use')}
          </Button>
        </div>

        <div className="w-full flex-1"></div>

        <Async
          fetch={fetch}
          refreshDeps={[rawTemplate]}
          loader={
            <div className="flex h-full w-full items-center justify-center">
              <Loader />
            </div>
          }
        >
          {template && (
            <div
              className={cn(
                'form-preview template-preview relative h-full w-full rounded-lg',
                `form-preview-${platform}`
              )}
            >
              <FormRenderer
                form={template as Any}
                autoSave={false}
                query={{}}
                locale={i18n.language}
                alwaysShowNextButton={true}
                enableQuestionList={true}
                enableNavigationArrows={true}
              />
            </div>
          )}
        </Async>
      </div>
    </div>
  )
}

export default function TemplatesModel({ onBack }: TemplatesModelProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { workspaceId, projectId } = useParam()
  const { closeModal } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const alert = useAlert()

  const [templates, setTemplates] = useState<TemplateType[]>([])
  const [template, setTemplate] = useState<TemplateType>()

  const { loading: importLoading, run: importForm } = useRequest(
    async (formJson: string) => {
      try {
        const result = await FormService.importFromJSON(projectId, formJson)
        closeModal('CreateFormModal')
        router.push(`/workspace/${workspaceId}/project/${projectId}/form/${result}/create`)
      } catch (error) {
        toast({
          title: t('components.error.title'),
          message: t(
            'form.template.importError',
            'Failed to import form. Please check the JSON format.'
          )
        })
      }
    },
    {
      manual: true
    }
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const json = e.target?.result as string

        JSON.parse(json)
        importForm(json)
      } catch (error) {
        toast({
          title: t('components.error.title'),
          message: t('form.template.invalidJson', 'Invalid JSON format. Please check your file.')
        })
      }
    }
    reader.onerror = () => {
      toast({
        title: t('components.error.title'),
        message: t('form.template.fileReadError', 'Failed to read file. Please try again.')
      })
    }
    reader.readAsText(file)
  }

  async function fetch() {
    const result = await FormService.teamTemplates(workspaceId)
    setTemplates(result)
    return true
  }

  async function handleDelete(tmpl: TemplateType, e: React.MouseEvent) {
    e.stopPropagation()

    alert({
      title: t('template.delete.title'),
      description: t('template.delete.description', { name: tmpl.name }),
      cancelProps: {
        label: t('components.cancel')
      },
      confirmProps: {
        label: t('components.delete'),
        className: 'bg-error text-primary-light dark:text-primary hover:bg-error'
      },
      fetch: async () => {
        await FormService.deleteTeamTemplate(tmpl.id, workspaceId)
        setTemplates(prev => prev.filter(t => t.id !== tmpl.id))
        toast({
          title: t('template.delete.success')
        })
      }
    })
  }

  if (template) {
    return <TemplatePreview template={template} onBack={() => setTemplate(undefined)} />
  }

  return (
    <div className="min-h-[calc(90vh-3.125rem)] w-[90vw]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="-ml-[0.15rem] inline-flex items-center gap-1 text-sm/6"
          onClick={onBack}
        >
          <IconChevronLeft className="h-5 w-5" />
          <span className="font-semibold">{t('form.template.headline')}</span>
        </button>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleFileChange}
            aria-label={t('form.template.importJson')}
          />
          <Button.Ghost
            size="sm"
            loading={importLoading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1"
          >
            <IconUpload className="h-4 w-4" />
            {t('form.template.importJson', 'Import from JSON')}
          </Button.Ghost>
        </div>
      </div>

      <Async
        fetch={fetch}
        refreshDeps={[workspaceId]}
        loader={
          <div className="flex h-[calc(90vh-15rem)] items-center justify-center">
            <Loader />
          </div>
        }
      >
        {templates.length === 0 ? (
          <div className="flex h-[calc(90vh-15rem)] flex-col items-center justify-center text-center">
            <p className="text-secondary text-sm">{t('template.workspace.empty')}</p>
            <p className="text-secondary mt-1 text-sm">{t('template.workspace.emptyHint')}</p>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {templates.map(tmpl => (
              <li
                key={tmpl.id}
                className="border-input group relative cursor-pointer rounded-lg border transition-shadow hover:shadow-md"
                onClick={() => setTemplate(tmpl)}
              >
                <div className="bg-secondary-light flex h-16 w-full items-center justify-center rounded-t-lg">
                  <span className="text-secondary text-xs">{tmpl.category}</span>
                </div>
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="flex-1 truncate text-sm font-semibold">{tmpl.name}</span>
                    <button
                      type="button"
                      className="text-secondary hover:text-error ml-1 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={e => handleDelete(tmpl, e)}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {tmpl.description && (
                    <p className="text-secondary mt-1 line-clamp-2 text-xs">{tmpl.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </div>
  )
}
