import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { IntegrationService } from '@/services'
import { useParam } from '@/utils'
import { helper } from '@voxly/utils'

import { Button, Image, Switch, Tooltip } from '@/components'
import { APP_STATUS_ENUM, INTEGRATION_STATUS_ENUM } from '@/consts'
import { useAppStore, useFormStore } from '@/store'
import { IntegratedAppType } from '@/types'

interface IntegrationItemProps {
  app: IntegratedAppType
}

const IntegrationItem: FC<IntegrationItemProps> = ({ app }) => {
  const { t } = useTranslation()

  const { formId } = useParam()
  const { openModal } = useAppStore()
  const { updateIntegration, deleteIntegration } = useFormStore()

  const active = useMemo(
    () =>
      helper.isValid(app.integration?.config) &&
      app.integration?.status === INTEGRATION_STATUS_ENUM.ACTIVE,
    [app.integration?.config, app.integration?.status]
  )

  const { loading: toggleLoading, run: toggleRun } = useRequest(
    async (checked: boolean) => {
      const status = checked ? INTEGRATION_STATUS_ENUM.ACTIVE : INTEGRATION_STATUS_ENUM.DISABLED

      await IntegrationService.updateStatus(formId, app.id, status)
      updateIntegration(app.id, { status })
    },
    {
      manual: true,
      refreshDeps: [formId, app.id]
    }
  )

  const { loading: deleteLoading, run: deleteRun } = useRequest(
    async () => {
      await IntegrationService.deleteSettings(formId, app.id)
      deleteIntegration(app.id)
    },
    {
      manual: true,
      refreshDeps: [formId, app.id]
    }
  )

  function handleConnect() {
    openModal('IntegrationSettingsModal', { app })
  }

  function handleEdit() {
    openModal('IntegrationSettingsModal', {
      app: {
        ...app,
        isAuthorized: true
      }
    })
  }

  const children = useMemo(() => {
    switch (app.status) {
      case APP_STATUS_ENUM.ACTIVE:
        return (
          <div className="flex items-center gap-x-1">
            <Switch value={active} loading={toggleLoading} onChange={toggleRun} />

            <Tooltip label={t('components.edit')}>
              <Button.Link size="sm" iconOnly onClick={handleEdit}>
                <IconPencil className="h-5 w-5" />
              </Button.Link>
            </Tooltip>

            <Tooltip label={t('components.delete')}>
              <Button.Link size="sm" loading={deleteLoading} iconOnly onClick={deleteRun}>
                <IconTrash className="h-5 w-5" />
              </Button.Link>
            </Tooltip>
          </div>
        )

      case APP_STATUS_ENUM.PENDING:
        return (
          <Button size="sm" onClick={handleConnect}>
            {t('form.integrations.connect')}
          </Button>
        )
    }
  }, [handleConnect, t, deleteLoading])

  return (
    <li className="border-input cursor-default rounded-lg border px-4 py-6 text-sm">
      <div className="flex items-center justify-between">
        <Image className="border-accent-light h-8 w-8 rounded-lg border" src={app.icon} />
        {children}
      </div>
      <div className="mt-2 font-medium">{app.name}</div>
      <div className="text-secondary mt-1">{app.description}</div>
    </li>
  )
}

export default IntegrationItem
