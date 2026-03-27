import { IconPlus } from '@tabler/icons-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { WorkspaceService } from '@/services'
import { canManageProjectMembers, useParam } from '@/utils'

import { Async, Avatar, Repeat, Tooltip } from '@/components'
import { useAppStore, useWorkspaceStore } from '@/store'

export default function ProjectMembers() {
  const { t } = useTranslation()

  const { workspaceId } = useParam()
  const { project, members, setMembers, workspace } = useWorkspaceStore()
  const { openModal } = useAppStore()

  const exists = useMemo(
    () => members.filter(m => project?.members.includes(m.id)),
    [members, project?.members]
  )

  async function fetch() {
    setMembers(workspaceId, await WorkspaceService.members(workspaceId))
    return true
  }

  return (
    <div className="mt-2">
      <button
        className="group flex cursor-pointer items-center -space-x-2"
        onClick={() => openModal('ProjectMembersModal')}
      >
        <Async
          fetch={fetch}
          refreshDeps={[workspaceId]}
          loader={
            <Repeat count={6}>
              <div className="skeleton ring-foreground h-9 w-9 rounded-full ring-2"></div>
            </Repeat>
          }
        >
          {exists.map(m => (
            <Tooltip key={m.id} label={m.name}>
              <div>
                <Avatar
                  className="ring-foreground h-9 w-9 rounded-full ring-2"
                  src={m.avatar}
                  fallback={m.name}
                  resize={{ width: 100, height: 100 }}
                />
              </div>
            </Tooltip>
          ))}
        </Async>

        {canManageProjectMembers(workspace) && (
          <Tooltip label={t('project.members.addMember')}>
            <div className="ring-foreground bg-accent-light text-secondary group-hover:bg-accent flex h-9 w-9 items-center justify-center rounded-full ring-2 transition-colors">
              <IconPlus className="h-4 w-4" />
            </div>
          </Tooltip>
        )}
      </button>
    </div>
  )
}
