import {
  IconCopy,
  IconDots,
  IconFolder,
  IconPencil,
  IconRestore,
  IconShare,
  IconTag,
  IconTemplate,
  IconTrash
} from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { FC, MouseEvent, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { FolderService, FormService } from '@/services'
import {
  canCreateForms,
  canDeleteForms,
  canEditForms,
  timeFromNow,
  timeToNow,
  useRouter
} from '@/utils'

import IconLink from '@/assets/link.svg?react'
import IconMoveTo from '@/assets/move-to.svg?react'
import { Badge, Button, Dropdown, Tooltip, useAlert, usePrompt } from '@/components'
import { useAppStore, useWorkspaceStore } from '@/store'
import { FolderType, FormType } from '@/types'

interface FormItemLinkProps extends ComponentProps {
  to: string
  isInTrash?: boolean
  isSuspended?: boolean
}

const FormStatus: FC<{ form?: FormType }> = ({ form }) => {
  const { t } = useTranslation()

  if (!form) {
    return null
  } else if (form.suspended) {
    return <Badge color="red">{t('form.suspended')}</Badge>
  } else if (form.isDraft) {
    return <Badge color="zinc">{t('form.draft')}</Badge>
  } else if (form.settings?.active) {
    return <Badge color="green">{t('form.active')}</Badge>
  } else {
    return <Badge color="zinc">{t('form.closed')}</Badge>
  }
}

const FormItemLink: FC<FormItemLinkProps> = ({
  to,
  isInTrash = false,
  isSuspended = false,
  children,
  ...restProps
}) => {
  const { t } = useTranslation()
  const alert = useAlert()

  function handleSuspend() {
    alert({
      title: t('form.suspend.headline'),
      description: t('form.suspend.subHeadline'),
      confirmProps: {
        label: t('form.suspend.contactUs')
      },
      onConfirm() {
        window.location.href = 'https://heyform.net/f/E4MKK2hx'
      }
    })
  }

  if (isSuspended) {
    return (
      <div {...restProps} onClick={handleSuspend}>
        {children}
      </div>
    )
  } else if (isInTrash) {
    return <div {...restProps}>{children}</div>
  } else {
    return (
      <Link to={to} {...restProps}>
        {children}
      </Link>
    )
  }
}

interface FormItemProps {
  form: FormType
  isInTrash?: boolean
  folders?: FolderType[]
  onChange?: (
    type: 'rename' | 'trash' | 'restore' | 'delete' | 'move' | 'moveToFolder',
    form: FormType
  ) => void
  onFolderChange?: () => void
}

const FormItem: FC<FormItemProps> = ({
  form,
  isInTrash,
  folders = [],
  onChange,
  onFolderChange
}) => {
  const { t, i18n } = useTranslation()

  const alert = useAlert()
  const prompt = usePrompt()
  const router = useRouter()
  const { workspace, sharingURLPrefix } = useWorkspaceStore()
  const { openModal } = useAppStore()

  const folderOptions = useMemo(() => {
    const opts = [
      {
        value: '__none__',
        label: t('folder.noFolder')
      }
    ]

    folders.forEach(folder => {
      opts.push({
        value: folder.id,
        label: folder.parentId ? `  ${folder.name}` : folder.name
      })
    })

    return opts
  }, [folders, t])

  const options = useMemo(
    () =>
      isInTrash
        ? ([
            canEditForms(workspace) && {
              value: 'restore',
              icon: <IconRestore className="h-4 w-4" />,
              label: 'components.restore'
            },
            canDeleteForms(workspace) && {
              value: 'delete',
              icon: <IconTrash className="h-4 w-4" />,
              label: 'components.permanentlyDelete'
            }
          ].filter(Boolean) as any[])
        : ([
            canEditForms(workspace) && {
              value: 'edit',
              icon: <IconPencil className="h-4 w-4" />,
              label: 'components.edit'
            },
            canEditForms(workspace) && {
              value: 'rename',
              icon: <IconTag className="h-4 w-4" />,
              label: 'components.rename'
            },
            {
              value: 'share',
              icon: <IconShare className="h-4 w-4" />,
              label: 'components.share'
            },
            canCreateForms(workspace) && {
              value: 'duplicate',
              icon: <IconCopy className="h-4 w-4" />,
              label: 'components.duplicate'
            },
            canEditForms(workspace) && {
              value: 'moveto',
              icon: <IconMoveTo className="h-4 w-4" />,
              label: 'components.moveto'
            },
            canEditForms(workspace) && {
              value: 'moveToFolder',
              icon: <IconFolder className="h-4 w-4" />,
              label: 'components.moveToFolder'
            },
            canEditForms(workspace) && {
              value: 'saveAsTemplate',
              icon: <IconTemplate className="h-4 w-4" />,
              label: 'form.saveAsTemplate'
            },
            canDeleteForms(workspace) && {
              value: 'trash',
              icon: <IconTrash className="h-4 w-4" />,
              label: 'components.delete'
            }
          ].filter(Boolean) as any[]),
    [isInTrash, workspace]
  )

  function handleEdit(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault()
    router.push(`/workspace/${form.teamId}/project/${form.projectId}/form/${form.id}/create`)
  }

  function handleShare(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault()
    router.push(`/workspace/${form.teamId}/project/${form.projectId}/form/${form.id}/share`)
  }

  const { runAsync: handleDuplicate } = useRequest(
    async () => {
      const name = t('form.duplicate', { name: form.name })
      const id = await FormService.duplicate(form.id, name)

      router.push(`/workspace/${form.teamId}/project/${form.projectId}/form/${id}/create`)
    },
    {
      refreshDeps: [form],
      manual: true
    }
  )

  function handleRename() {
    prompt({
      value: form,
      title: t('project.rename.headline'),
      inputProps: {
        name: 'name',
        label: t('project.rename.name.label'),
        rules: [
          {
            required: true,
            message: t('project.rename.name.required')
          }
        ]
      },
      submitProps: {
        className: '!mt-4 px-5 min-w-24',
        size: 'md',
        label: t('components.save')
      },
      fetch: async values => {
        await FormService.update(form.id, values)

        onChange?.('rename', {
          ...form,
          ...values
        })
      }
    })
  }

  function handleMoveTo() {
    prompt({
      value: {
        projectId: form.projectId
      },
      title: t('project.moveto.headline', { name: form.name }),
      selectProps: {
        className: 'w-full',
        name: 'projectId',
        rules: [
          {
            required: true,
            message: t('project.moveto.project.required')
          }
        ],
        options: workspace.projects || [],
        labelKey: 'name',
        valueKey: 'id'
      },
      submitProps: {
        className: '!mt-4 px-5 min-w-24',
        size: 'md',
        label: t('components.save')
      },
      submitOnChangedOnly: true,
      fetch: async values => {
        const result = await FormService.moveToProject(form.id, values.projectId)

        if (result) {
          router.replace(
            `/workspace/${form.teamId}/project/${values.projectId}/form/${form.id}/analytics`
          )
        }
      }
    })
  }

  function handleMoveToFolder() {
    prompt({
      value: {
        folderId: form.folderId || '__none__'
      },
      title: t('folder.moveToFolder', { name: form.name }),
      selectProps: {
        className: 'w-full',
        name: 'folderId',
        rules: [
          {
            required: true,
            message: t('folder.select.required')
          }
        ],
        options: folderOptions,
        labelKey: 'label',
        valueKey: 'value'
      },
      submitProps: {
        className: '!mt-4 px-5 min-w-24',
        size: 'md',
        label: t('components.save')
      },
      submitOnChangedOnly: true,
      fetch: async values => {
        const targetFolderId = values.folderId === '__none__' ? null : values.folderId
        const result = await FolderService.moveFormsToFolder(
          form.projectId,
          [form.id],
          targetFolderId
        )

        if (result) {
          onChange?.('moveToFolder', {
            ...form,
            folderId: targetFolderId
          })
          onFolderChange?.()
        }
      }
    })
  }

  const { runAsync } = useRequest(
    async (type: string) => {
      switch (type) {
        case 'trash':
          await FormService.moveToTrash(form.id)
          onChange?.(type, form)
          break

        case 'restore':
          await FormService.restoreForm(form.id)
          onChange?.(type, form)
          break

        case 'delete':
          alert({
            title: t('project.trash.delete.headline', { name: form.name }),
            description: t('project.trash.delete.subHeadline'),
            cancelProps: {
              label: t('components.cancel')
            },
            confirmProps: {
              label: t('components.delete'),
              className: 'bg-error text-primary-light dark:text-primary hover:bg-error'
            },
            fetch: async () => {
              await FormService.delete(form.id)
              onChange?.(type, form)
            }
          })
          break
      }
    },
    {
      refreshDeps: [form],
      manual: true
    }
  )

  async function handleClick(value: string) {
    switch (value) {
      case 'edit':
        return handleEdit()

      case 'share':
        return handleShare()

      case 'rename':
        return handleRename()

      case 'duplicate':
        return handleDuplicate()

      case 'moveto':
        return handleMoveTo()

      case 'moveToFolder':
        return handleMoveToFolder()

      case 'saveAsTemplate':
        return openModal('SaveAsTemplateModal', {
          formId: form.id,
          formName: form.name
        })

      case 'trash':
      case 'restore':
      case 'delete':
        return runAsync(value)
    }
  }

  return (
    <FormItemLink
      className="first-of-type:border-accent-light last-of-type:border-accent-light hover:bg-secondary-light has-[[data-state=open]]:bg-secondary-light group flex items-center justify-between gap-6 py-4 first-of-type:border-t last-of-type:border-b"
      to={`/workspace/${form.teamId}/project/${form.projectId}/form/${form.id}/analytics`}
      isInTrash={isInTrash}
      isSuspended={form.suspended}
    >
      <div className="flex-1 pl-2">
        <div className="text-sm/6 font-medium">{form.name}</div>
        <div className="text-secondary text-sm/6">
          {isInTrash
            ? t('form.metadata2', {
                count: form.submissionCount,
                date: timeToNow(form.retentionAt, i18n.language)
              })
            : t('form.metadata', {
                count: form.submissionCount,
                date: timeFromNow(form.updatedAt, i18n.language)
              })}
        </div>
        {form.tags && form.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {form.tags.slice(0, 5).map((tag, index) => (
              <span
                key={index}
                className="bg-secondary-light text-secondary rounded px-1.5 py-0.5 text-xs"
              >
                {tag}
              </span>
            ))}
            {form.tags.length > 5 && (
              <span className="text-secondary px-1.5 py-0.5 text-xs">+{form.tags.length - 5}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!isInTrash && !form.suspended && (
          <div className="invisible flex items-center group-hover:visible">
            <Button.Copy
              size="sm"
              className="text-primary [&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem]"
              text={`${sharingURLPrefix}/form/${form.id}`}
              label={t('form.copyLinkToShare')}
              icon={<IconLink strokeWidth={2.2} />}
            />

            {canEditForms(workspace) && (
              <Tooltip label={t('components.edit')}>
                <Button.Link size="sm" iconOnly onClick={handleEdit}>
                  <IconPencil className="h-5 w-5" />
                </Button.Link>
              </Tooltip>
            )}
          </div>
        )}

        <FormStatus form={form} />

        {!form.suspended && (
          <Dropdown
            contentProps={{
              className:
                'min-w-36 [&_[data-value=delete]]:text-error [&_[data-value=trash]]:text-error',
              side: 'bottom',
              sideOffset: 8,
              align: 'end'
            }}
            options={options}
            multiLanguage
            onClick={handleClick}
          >
            <Button.Link size="sm" className="data-[state=open]:bg-accent-light" iconOnly>
              <Tooltip label={t('form.menuTip')}>
                <IconDots className="h-4 w-4" />
              </Tooltip>
            </Button.Link>
          </Dropdown>
        )}
      </div>
    </FormItemLink>
  )
}

const Skeleton = () => {
  return (
    <div className="first-of-type:border-accent-light last-of-type:border-accent-light group flex items-center justify-between gap-6 py-4 first-of-type:border-t last-of-type:border-b">
      <div className="flex-1">
        <div className="py-[0.3125rem]">
          <div className="skeleton h-3.5 w-24 rounded-sm"></div>
        </div>
        <div className="py-[0.3125rem]">
          <div className="skeleton h-3.5 w-52 rounded-sm"></div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="skeleton h-5 w-24 rounded-sm"></div>
      </div>
    </div>
  )
}

export default Object.assign(FormItem, {
  Skeleton
})
