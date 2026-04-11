import { IconCheck, IconChevronDown, IconChevronRight, IconFolder } from '@tabler/icons-react'
import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FolderService } from '@/services'

import { Badge, Dropdown, usePrompt } from '@/components'
import { useAppStore, useWorkspaceStore } from '@/store'
import { FolderType, FormType } from '@/types'

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

interface FolderColorPickerProps {
  currentColor?: string
  onSelect: (color: string | null) => void
}

const FolderColorPicker: FC<FolderColorPickerProps> = ({ currentColor, onSelect }) => (
  <div className="flex flex-wrap gap-1.5 p-1">
    {FOLDER_COLORS.map((color, i) => (
      <button
        key={i}
        className="relative flex h-5 w-5 items-center justify-center rounded-full border border-transparent transition-transform hover:scale-110"
        style={{ backgroundColor: color ?? '#e5e7eb' }}
        onClick={() => onSelect(color)}
      >
        {color === (currentColor ?? null) && (
          <IconCheck className="h-3 w-3 text-white drop-shadow" />
        )}
      </button>
    ))}
  </div>
)

interface FolderSectionProps {
  folder: FolderType
  forms: FormType[]
  subFolders: FolderType[]
  onFormChange: (type: string, form: FormType) => void
  onFolderChange: () => void
  children?: React.ReactNode
}

export const FolderSection: FC<FolderSectionProps> = ({
  folder,
  forms,
  subFolders,
  onFolderChange,
  children
}) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const { openModal } = useAppStore()
  const { updateFolder } = useWorkspaceStore()
  const [isExpanded, setIsExpanded] = useState(
    localStorage.getItem(`folder-${folder.id}-expanded`) === 'true'
  )

  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    localStorage.setItem(`folder-${folder.id}-expanded`, String(newState))
  }

  const handleRename = () => {
    prompt({
      value: { name: folder.name },
      title: t('folder.rename'),
      inputProps: {
        name: 'name',
        label: t('folder.name.label'),
        rules: [
          {
            required: true,
            message: t('folder.name.required')
          }
        ]
      },
      submitProps: {
        className: '!mt-4 px-5 min-w-24',
        size: 'md',
        label: t('components.save')
      },
      fetch: async (values: any) => {
        await FolderService.update(folder.projectId, folder.id, { name: values.name })
        onFolderChange()
      }
    })
  }

  const handleDelete = async () => {
    await FolderService.delete(folder.projectId, folder.id)
    onFolderChange()
  }

  const handleCreateSubfolder = () => {
    openModal('CreateFolderModal', { parentId: folder.id })
  }

  const handleColorSelect = async (color: string | null) => {
    await FolderService.update(folder.projectId, folder.id, { color: color ?? '' })
    updateFolder(folder.projectId, folder.id, { color: color ?? undefined })
  }

  const options = [
    {
      value: 'rename',
      icon: <IconFolder className="h-4 w-4" />,
      label: t('folder.rename')
    },
    folder.parentId === null && {
      value: 'createSub',
      icon: <IconFolder className="h-4 w-4" />,
      label: t('folder.createSub')
    },
    {
      value: 'color',
      label: <FolderColorPicker currentColor={folder.color} onSelect={handleColorSelect} />,
      type: 'custom'
    },
    {
      value: 'delete',
      icon: <IconFolder className="h-4 w-4" />,
      label: t('folder.delete')
    }
  ].filter(Boolean) as any[]

  return (
    <div className="folder-section">
      <div
        className="hover:bg-secondary-light flex cursor-pointer items-center gap-2 rounded-md px-2 py-3"
        onClick={toggleExpanded}
      >
        {isExpanded ? (
          <IconChevronDown className="text-secondary h-4 w-4" />
        ) : (
          <IconChevronRight className="text-secondary h-4 w-4" />
        )}
        <IconFolder
          className={folder.color ? 'h-5 w-5' : 'text-secondary h-5 w-5'}
          style={folder.color ? { color: folder.color } : undefined}
        />
        <span className="text-sm font-medium">{folder.name}</span>
        <Badge color="zinc">{forms.length + subFolders.length}</Badge>
        <div className="ml-auto" onClick={e => e.stopPropagation()}>
          <Dropdown
            contentProps={{ className: 'min-w-36' }}
            options={options}
            onClick={async (value: string) => {
              switch (value) {
                case 'rename':
                  handleRename()
                  break
                case 'createSub':
                  handleCreateSubfolder()
                  break
                case 'delete':
                  handleDelete()
                  break
              }
            }}
          >
            <button className="hover:bg-accent-light rounded p-1">
              <span className="text-xs">•••</span>
            </button>
          </Dropdown>
        </div>
      </div>

      {isExpanded && <div className="pl-6">{children}</div>}
    </div>
  )
}
