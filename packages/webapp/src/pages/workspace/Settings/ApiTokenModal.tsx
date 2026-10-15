import { IconCopy } from '@tabler/icons-react'
import { useForm as useRCForm } from 'rc-field-form'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiTokenService, CreateApiTokenType } from '@/services'
import { cn, useFormState, useParam } from '@/utils'

import { Button, Form, Input, Modal, useToast } from '@/components'
import { useModal } from '@/store'

const SCOPE_OPTIONS = [
  {
    value: 'read',
    labelKey: 'settings.apiTokens.scopeRead'
  },
  {
    value: 'read_write',
    labelKey: 'settings.apiTokens.scopeReadWrite'
  }
]

export default function ApiTokenModal() {
  const { t } = useTranslation()

  const toast = useToast()
  const { workspaceId } = useParam()
  const [rcForm] = useRCForm()

  const { isOpen, onOpenChange } = useModal('ApiTokenModal')
  const [loading, error, { setTrue, setFalse, setError }] = useFormState()

  const [step, setStep] = useState<'form' | 'success'>('form')
  const [createdToken, setCreatedToken] = useState<CreateApiTokenType | null>(null)

  const endpoint = useMemo(() => `${window.location.origin}/api/mcp`, [])
  const configExample = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            heyform: {
              url: endpoint,
              headers: {
                Authorization: `Bearer ${createdToken?.token}`
              }
            }
          }
        },
        null,
        2
      ),
    [createdToken, endpoint]
  )

  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setCreatedToken(null)
      rcForm.resetFields()
    }
  }, [isOpen, rcForm])

  async function handleFinish(values: any) {
    setTrue()
    setError(undefined)

    try {
      const result = await ApiTokenService.create(workspaceId, values.name, values.scope)

      setCreatedToken(result)
      setStep('success')
      rcForm.resetFields()

      toast({
        title: t('settings.apiTokens.createSuccess')
      })
    } catch (err: any) {
      setError(err)
    }

    setFalse()
  }

  return (
    <Modal.Simple
      open={isOpen}
      title={
        step === 'form' ? t('settings.apiTokens.createToken') : t('settings.apiTokens.yourToken')
      }
      description={step === 'success' ? t('settings.apiTokens.tokenWarning') : undefined}
      loading={loading}
      onOpenChange={onOpenChange}
    >
      {step === 'form' ? (
        <Form
          form={rcForm}
          initialValues={{
            name: '',
            scope: 'read'
          }}
          onFinish={handleFinish}
        >
          <Form.Item
            name="name"
            label={t('settings.apiTokens.name')}
            rules={[
              {
                required: true,
                message: t('settings.apiTokens.namePlaceholder')
              }
            ]}
          >
            <Input placeholder={t('settings.apiTokens.namePlaceholder')} />
          </Form.Item>

          <Form.Item name="scope" label={t('settings.apiTokens.scope')}>
            {(control: any) => (
              <div className="space-y-2">
                {SCOPE_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                      {
                        'border-primary bg-primary/5': control.value === option.value,
                        'border-input hover:bg-accent-light/50': control.value !== option.value
                      }
                    )}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={option.value}
                      checked={control.value === option.value}
                      onChange={event => control.onChange(event.target.value)}
                      className="accent-primary h-4 w-4"
                    />
                    <span className="text-sm/6 font-medium">{t(option.labelKey)}</span>
                  </label>
                ))}
              </div>
            )}
          </Form.Item>

          <div className="mt-6 flex items-center justify-end gap-x-3">
            <Button.Ghost size="md" onClick={() => onOpenChange(false)}>
              {t('components.cancel')}
            </Button.Ghost>
            <Button type="submit" size="md" loading={loading}>
              {t('settings.apiTokens.createToken')}
            </Button>
          </div>

          {error && !loading && <div className="text-error !mt-4 text-sm/6">{error.message}</div>}
        </Form>
      ) : (
        <div className="space-y-6">
          <div className="text-sm font-medium">{t('settings.apiTokens.mcpConnection')}</div>

          <div className="space-y-2">
            <div className="text-secondary text-sm">{t('settings.apiTokens.yourToken')}</div>
            <div className="border-input bg-accent-light/30 flex items-center gap-2 rounded-lg border p-3">
              <code className="flex-1 break-all font-mono text-sm">{createdToken?.token}</code>
              <Button.Copy
                icon={<IconCopy className="h-5 w-5" />}
                text={createdToken?.token || ''}
                label={t('components.copy')}
                size="sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-secondary text-sm">{t('settings.apiTokens.endpoint')}</div>
            <div className="border-input bg-accent-light/30 flex items-center gap-2 rounded-lg border p-3">
              <code className="flex-1 break-all font-mono text-sm">{endpoint}</code>
              <Button.Copy
                icon={<IconCopy className="h-5 w-5" />}
                text={endpoint}
                label={t('components.copy')}
                size="sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-secondary text-sm">{t('settings.apiTokens.configExample')}</div>
            <div className="border-input bg-accent-light/30 relative rounded-lg border p-3">
              <div className="absolute right-2 top-2">
                <Button.Copy2
                  text={configExample}
                  label={t('settings.apiTokens.copyConfig')}
                  size="sm"
                />
              </div>
              <pre className="overflow-auto whitespace-pre-wrap break-all pr-24 font-mono text-xs">
                {configExample}
              </pre>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="md" onClick={() => onOpenChange(false)}>
              {t('settings.apiTokens.close')}
            </Button>
          </div>
        </div>
      )}
    </Modal.Simple>
  )
}
