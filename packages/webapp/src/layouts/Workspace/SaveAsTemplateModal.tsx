import { useBoolean } from 'ahooks'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { FormService } from '@/services'

import { Form, Input, Modal, Select, SimpleFormProps, useToast } from '@/components'
import { TEMPLATE_CATEGORIES } from '@/consts'
import { useModal } from '@/store'

interface SaveAsTemplateFormProps extends Pick<SimpleFormProps, 'onLoadingChange'> {
  formId: string
  formName: string
}

const SaveAsTemplateForm: FC<SaveAsTemplateFormProps> = ({ formId, formName, onLoadingChange }) => {
  const { t } = useTranslation()
  const toast = useToast()
  const { close } = useModal('SaveAsTemplateModal')

  const categoryOptions = TEMPLATE_CATEGORIES.map(category => ({
    value: category,
    label: category
  }))

  async function fetch(values: { name: string; category: string; description?: string }) {
    await FormService.saveAsTemplate({
      formId,
      name: values.name,
      category: values.category,
      description: values.description
    })

    toast({
      title: t('template.save.success')
    })

    close()
  }

  return (
    <Form.Simple
      className="space-y-4"
      fetch={fetch}
      initialValues={{
        name: formName
      }}
      submitProps={{
        className: 'px-5 min-w-24',
        size: 'md',
        label: t('components.save')
      }}
      onLoadingChange={onLoadingChange}
    >
      <Form.Item
        name="name"
        label={t('template.save.name')}
        rules={[
          {
            required: true,
            message: t('template.save.nameRequired')
          }
        ]}
      >
        <Input autoComplete="off" />
      </Form.Item>

      <Form.Item
        name="category"
        label={t('template.save.category')}
        rules={[
          {
            required: true,
            message: t('template.save.categoryRequired')
          }
        ]}
      >
        <Select className="w-full" options={categoryOptions} />
      </Form.Item>

      <Form.Item name="description" label={t('template.save.description')}>
        <Input.TextArea rows={3} />
      </Form.Item>
    </Form.Simple>
  )
}

export default function SaveAsTemplateModal() {
  const { t } = useTranslation()

  const { isOpen, payload, onOpenChange } = useModal<{ formId: string; formName: string }>(
    'SaveAsTemplateModal'
  )
  const [loading, { set }] = useBoolean(false)

  return (
    <Modal.Simple
      open={isOpen}
      title={t('template.save.title')}
      description={t('template.save.subHeadline')}
      loading={loading}
      onOpenChange={onOpenChange}
    >
      {payload && (
        <SaveAsTemplateForm
          formId={payload.formId}
          formName={payload.formName}
          onLoadingChange={set}
        />
      )}
    </Modal.Simple>
  )
}
