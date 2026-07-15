import { IconChevronDown, IconDots } from '@tabler/icons-react'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { WorkspaceService } from '@/services'
import { timeFromNow } from '@/utils'
import { canChangeRoles, canManageMembers, canTransferOwnership } from '@/utils/permissions'

import { Avatar, Button, Dropdown, Tooltip, useAlert } from '@/components'
import { ROLE_LABELS, TeamRoleEnum } from '@/consts/team-role'
import { useUserStore, useWorkspaceStore } from '@/store'
import { MemberType } from '@/types'

const ROLE_OPTIONS = [
  { label: 'members.admin', value: String(TeamRoleEnum.ADMIN) },
  { label: 'members.collaborator', value: String(TeamRoleEnum.COLLABORATOR) },
  { label: 'members.member', value: String(TeamRoleEnum.MEMBER) }
]

const MemberItem: FC<{ member: MemberType }> = ({ member }) => {
  const { t, i18n } = useTranslation()

  const alert = useAlert()
  const { workspace, setWorkspaces, setMembers, removeMember, deleteWorkspace, updateMemberRole } =
    useWorkspaceStore()
  const { user } = useUserStore()

  const isYou = useMemo(() => member.id === user.id, [member.id, user.id])

  const RoleCell = useMemo(() => {
    if (member.isOwner) {
      return <span>{t('members.owner')}</span>
    }

    if (canChangeRoles(workspace)) {
      return (
        <Dropdown
          contentProps={{ sideOffset: 8 }}
          options={ROLE_OPTIONS}
          multiLanguage
          onClick={async value => {
            const role = Number(value)
            await WorkspaceService.updateMemberRole(workspace.id, member.id, role)
            updateMemberRole(workspace.id, member.id, role)
          }}
        >
          <button className="border-accent hover:bg-accent-light data-[state=open]:bg-accent-light flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors">
            {t(ROLE_LABELS[member.role] ?? 'members.member')}
            <IconChevronDown className="text-secondary h-3.5 w-3.5 shrink-0" />
          </button>
        </Dropdown>
      )
    }

    return <span>{t(ROLE_LABELS[member.role] ?? 'members.member')}</span>
  }, [member.isOwner, member.role, workspace, t, updateMemberRole])

  const Action = useMemo(() => {
    if (isYou) {
      if (workspace?.isOwner) return null
      return (
        <Dropdown
          contentProps={{ sideOffset: 8 }}
          options={[{ label: 'members.leave.title', value: 'leave' }]}
          multiLanguage
          onClick={() => {
            alert({
              title: t('members.leave.headline'),
              description: t('members.leave.subHeadline'),
              cancelProps: { label: t('components.cancel') },
              confirmProps: {
                label: t('members.leave.confirm'),
                className: 'bg-error hover:bg-error text-primary-light dark:text-primary'
              },
              fetch: async () => {
                await WorkspaceService.leave(workspace.id)
                deleteWorkspace(workspace.id)
              }
            })
          }}
        >
          <Button.Link className="data-[state=open]:bg-accent-light" size="sm" iconOnly>
            <Tooltip label={t('members.menuTip')}>
              <IconDots className="text-secondary h-5 w-5" />
            </Tooltip>
          </Button.Link>
        </Dropdown>
      )
    }

    if (!canManageMembers(workspace)) {
      return null
    }

    if (member.isOwner) {
      return null
    }

    const options = []

    if (canTransferOwnership(workspace)) {
      options.push({ label: 'members.transfer.title', value: 'transfer' })
    }

    options.push({ label: 'members.remove.title', value: 'remove' })

    function handleTransfer() {
      alert({
        title: t('members.transfer.headline', { name: member.name }),
        description: t('members.transfer.subHeadline'),
        cancelProps: { label: t('components.cancel') },
        confirmProps: {
          label: t('members.transfer.confirm'),
          className: 'bg-error hover:bg-error text-primary-light dark:text-primary'
        },
        fetch: async () => {
          await WorkspaceService.transfer(workspace.id, member.id)
          const [res1, res2] = await Promise.all([
            WorkspaceService.workspaces(),
            WorkspaceService.members(workspace.id)
          ])
          setWorkspaces(res1)
          setMembers(workspace.id, res2)
        }
      })
    }

    function handleRemove() {
      alert({
        title: t('members.remove.headline', { name: member.name }),
        description: t('members.remove.subHeadline'),
        cancelProps: { label: t('components.cancel') },
        confirmProps: {
          label: t('members.remove.confirm'),
          className: 'bg-error hover:bg-error text-primary-light dark:text-primary'
        },
        fetch: async () => {
          await WorkspaceService.removeMember(workspace.id, member.id)
          removeMember(workspace.id, member.id)
        }
      })
    }

    function handleClick(value: string) {
      switch (value) {
        case 'transfer':
          return handleTransfer()
        case 'remove':
          return handleRemove()
      }
    }

    return (
      <Dropdown
        contentProps={{
          className: '[&_[data-value=remove]]:text-error',
          sideOffset: 8
        }}
        options={options}
        multiLanguage
        onClick={handleClick}
      >
        <Button.Link className="data-[state=open]:bg-accent-light" size="sm" iconOnly>
          <Tooltip label={t('members.menuTip')}>
            <IconDots className="text-secondary h-5 w-5" />
          </Tooltip>
        </Button.Link>
      </Dropdown>
    )
  }, [workspace?.isOwner, workspace?.role, t, isYou, member.isOwner])

  return (
    <tr className="hover:bg-primary/[2.5%]">
      <td className="border-accent border-b p-4 sm:first:pl-1 sm:last:pr-1">
        <div className="flex items-center gap-4">
          <Avatar className="flex-shrink-0" src={member.avatar} fallback={member.name} />
          <div className="text-sm">
            <div className="font-medium">
              <span>{member.name}</span>
              {member.id === user.id && (
                <span className="text-secondary ml-1 font-normal">({t('members.you')})</span>
              )}
            </div>
            <div className="text-secondary">{member.email}</div>
          </div>
        </div>
      </td>

      <td className="border-accent border-b p-4 sm:first:pl-1 sm:last:pr-1">{RoleCell}</td>

      <td className="border-accent border-b p-4 sm:first:pl-1 sm:last:pr-1">
        {member.lastSeenAt ? timeFromNow(member.lastSeenAt, i18n.language) : ''}
      </td>

      <td className="border-accent border-b p-4 sm:first:pl-1 sm:last:pr-1">{Action}</td>
    </tr>
  )
}

const Skeleton = () => {
  return (
    <tr>
      <td className="border-accent border-b p-4 sm:first:pl-1 sm:last:pr-1">
        <div className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-full"></div>
          <div>
            <div className="py-[0.1875rem]">
              <div className="skeleton h-3.5 w-14 rounded-sm"></div>
            </div>
            <div className="py-[0.1875rem]">
              <div className="skeleton h-3.5 w-36 rounded-sm"></div>
            </div>
          </div>
        </div>
      </td>

      <td className="border-accent border-b p-4 sm:first:pl-1 sm:last:pr-1">
        <div className="py-[0.3125rem]">
          <div className="skeleton h-3.5 w-36 rounded-sm"></div>
        </div>
      </td>

      <td className="border-accent border-b p-4 sm:first:pl-1 sm:last:pr-1">
        <div className="py-[0.3125rem]">
          <div className="skeleton h-3.5 w-36 rounded-sm"></div>
        </div>
      </td>

      <td className="border-accent border-b p-4 sm:first:pl-1 sm:last:pr-1"></td>
    </tr>
  )
}

export default Object.assign(MemberItem, {
  Skeleton
})
