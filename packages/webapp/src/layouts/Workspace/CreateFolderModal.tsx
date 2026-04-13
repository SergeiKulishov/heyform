import { IconCheck } from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FolderService } from '@/services'
import { useParam } from '@/utils'

import { Button, Input, Modal, Select } from '@/components'
import { FOLDER_ICON_MAP, FolderIconName, getFolderIcon } from '@/consts'
import { useAppStore, useModal, useWorkspaceStore } from '@/store'

const FOLDER_COLORS: Array<string | null> = [
  null,
  '#6b7280',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899'
]

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
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<FolderIconName | undefined>(undefined)

  const { loading, run } = useRequest(
    async () => {
      const newFolder = await FolderService.create({
        projectId,
        name: name.trim(),
        parentId: parentId ?? selectedParentId,
        color: selectedColor ?? undefined,
        icon: selectedIcon
      })
      if (newFolder) {
        addFolder(projectId, newFolder)
      }
      closeModal('CreateFolderModal')
      onSuccess?.()
    },
    {
      refreshDeps: [name, parentId, selectedParentId, selectedIcon],
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

        <div>
          <label className="mb-1.5 block text-sm font-medium">{t('folder.color.label')}</label>
          <div className="flex flex-wrap gap-1.5">
            {FOLDER_COLORS.map((color, i) => (
              <button
                key={i}
                type="button"
                className="relative flex h-6 w-6 items-center justify-center rounded-full border border-transparent transition-transform hover:scale-110"
                style={{ backgroundColor: color ?? '#e5e7eb' }}
                onClick={() => setSelectedColor(color)}
              >
                {color === selectedColor && (
                  <IconCheck className="h-3.5 w-3.5 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">{t('folder.icon.label')}</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(FOLDER_ICON_MAP) as [FolderIconName, any][]).map(([name, Icon]) => {
              const isSelected = name === (selectedIcon ?? 'Folder')
              return (
                <button
                  key={name}
                  type="button"
                  className={`relative flex h-6 w-6 items-center justify-center rounded border transition-transform hover:scale-110 ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent'
                  }`}
                  onClick={() => setSelectedIcon(name)}
                >
                  <Icon
                    className="h-4 w-4"
                    style={selectedColor ? { color: selectedColor } : undefined}
                  />
                </button>
              )
            })}
          </div>
        </div>

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
