import { useRequest } from 'ahooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FolderService } from '@/services'
import { useParam } from '@/utils'

import { Button, Input, Modal, Select } from '@/components'
import { useAppStore, useModal, useWorkspaceStore } from '@/store'

interface CreateFolderComponentProps {
  parentId?: string | null
  onSuccess?: () => void
  onBack?: () => void
}

const CreateFolderComponent: React.FC<CreateFolderComponentProps> = ({
  parentId,
  onSuccess,
  onBack
}) => {
  const { t } = useTranslation()
  const { projectId } = useParam()
  const { closeModal } = useAppStore()
  const { folders, addFolder } = useWorkspaceStore()

  const [name, setName] = useState('')
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined)

  const { loading, run } = useRequest(
    async () => {
      const newFolder = await FolderService.create({
        projectId,
        name: name.trim(),
        parentId: parentId ?? selectedParentId
      })
      if (newFolder) {
        addFolder(projectId, newFolder)
      }
      closeModal('CreateFolderModal')
      onSuccess?.()
    },
    {
      refreshDeps: [name, parentId, selectedParentId],
      manual: true
    }
  )

  const parentFolders = folders.filter(f => f.parentId === null)

  return (
    <>
      <h2 className="text-primary text-balance text-xl/6 font-semibold sm:text-lg/6">
        {parentId ? t('folder.createSub') : t('folder.create')}
      </h2>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">{t('folder.name.label')}</label>
          <Input
            value={name}
            onChange={setName}
            placeholder={t('folder.name.placeholder')}
            maxLength={100}
          />
        </div>

        {parentId === undefined && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t('folder.parent.label')}</label>
            <Select
              value={selectedParentId ?? '__none__'}
              options={[
                { value: '__none__', label: t('folder.parent.none') },
                ...parentFolders.map(folder => ({ value: folder.id, label: folder.name }))
              ]}
              labelKey="label"
              valueKey="value"
              onChange={(val: string) => setSelectedParentId(val === '__none__' ? undefined : val)}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {onBack && <Button.Ghost onClick={onBack}>{t('components.cancel')}</Button.Ghost>}
          <Button onClick={run} loading={loading} disabled={!name.trim()}>
            {t('folder.create')}
          </Button>
        </div>
      </div>
    </>
  )
}

export default function CreateFolderModal() {
  const { isOpen, onOpenChange, payload } = useModal<{ parentId?: string }>('CreateFolderModal')

  return (
    <Modal
      open={isOpen}
      contentProps={{
        id: 'create-folder-modal',
        className: 'sm:max-w-md w-full'
      }}
      onOpenChange={onOpenChange}
    >
      <CreateFolderComponent parentId={payload?.parentId} />
    </Modal>
  )
}
