import { IconLock } from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { WorkspaceService } from '@/services'
import { cn, isWorkspaceOwner, useParam } from '@/utils'

import { Button, Switch, Tooltip } from '@/components'
import { DEFAULT_PERMISSION_MATRIX, PermissionKey, TeamRoleEnum } from '@/consts/team-role'
import { useWorkspaceStore } from '@/store'

interface PermissionRow {
  key: PermissionKey
  labelKey: string
  group: string
}

const PERMISSION_ROWS: PermissionRow[] = [
  {
    key: PermissionKey.WORKSPACE_SETTINGS,
    labelKey: 'settings.permissions.keys.workspace.settings',
    group: 'workspace'
  },
  {
    key: PermissionKey.WORKSPACE_MEMBERS_INVITE,
    labelKey: 'settings.permissions.keys.workspace.members.invite',
    group: 'workspace'
  },
  {
    key: PermissionKey.WORKSPACE_MEMBERS_REMOVE,
    labelKey: 'settings.permissions.keys.workspace.members.remove',
    group: 'workspace'
  },
  {
    key: PermissionKey.WORKSPACE_MEMBERS_ROLE,
    labelKey: 'settings.permissions.keys.workspace.members.role',
    group: 'workspace'
  },
  {
    key: PermissionKey.WORKSPACE_BRANDING,
    labelKey: 'settings.permissions.keys.workspace.branding',
    group: 'workspace'
  },
  {
    key: PermissionKey.PROJECT_CREATE,
    labelKey: 'settings.permissions.keys.project.create',
    group: 'project'
  },
  {
    key: PermissionKey.PROJECT_DELETE,
    labelKey: 'settings.permissions.keys.project.delete',
    group: 'project'
  },
  {
    key: PermissionKey.PROJECT_MEMBERS,
    labelKey: 'settings.permissions.keys.project.members',
    group: 'project'
  },
  {
    key: PermissionKey.FORM_CREATE,
    labelKey: 'settings.permissions.keys.form.create',
    group: 'form'
  },
  {
    key: PermissionKey.FORM_EDIT,
    labelKey: 'settings.permissions.keys.form.edit',
    group: 'form'
  },
  {
    key: PermissionKey.FORM_DELETE,
    labelKey: 'settings.permissions.keys.form.delete',
    group: 'form'
  },
  {
    key: PermissionKey.FORM_PUBLISH,
    labelKey: 'settings.permissions.keys.form.publish',
    group: 'form'
  },
  {
    key: PermissionKey.SUBMISSION_VIEW,
    labelKey: 'settings.permissions.keys.submission.view',
    group: 'submission'
  },
  {
    key: PermissionKey.SUBMISSION_EDIT,
    labelKey: 'settings.permissions.keys.submission.edit',
    group: 'submission'
  },
  {
    key: PermissionKey.SUBMISSION_DELETE,
    labelKey: 'settings.permissions.keys.submission.delete',
    group: 'submission'
  },
  {
    key: PermissionKey.INTEGRATION_MANAGE,
    labelKey: 'settings.permissions.keys.integration.manage',
    group: 'integration'
  }
]

const GROUPS = [
  { key: 'workspace', labelKey: 'settings.permissions.groups.workspace' },
  { key: 'project', labelKey: 'settings.permissions.groups.project' },
  { key: 'form', labelKey: 'settings.permissions.groups.form' },
  { key: 'submission', labelKey: 'settings.permissions.groups.submission' },
  { key: 'integration', labelKey: 'settings.permissions.groups.integration' }
]

export default function WorkspacePermissions() {
  const { t } = useTranslation()

  const { workspaceId } = useParam()
  const { workspace, updatePermissionMatrix } = useWorkspaceStore()

  const isOwner = isWorkspaceOwner(workspace)

  const currentMatrix: Record<string, number[]> = workspace?.permissionMatrix || {}

  const [localMatrix, setLocalMatrix] = useState<Record<string, number[]>>(() => {
    const matrix: Record<string, number[]> = {}
    for (const row of PERMISSION_ROWS) {
      matrix[row.key] = [...(currentMatrix[row.key] || DEFAULT_PERMISSION_MATRIX[row.key] || [])]
    }
    return matrix
  })

  const hasChanges = JSON.stringify(localMatrix) !== JSON.stringify(currentMatrix)

  const { run: savePermissions, loading: saving } = useRequest(
    async () => {
      await WorkspaceService.updatePermissionMatrix(workspaceId, localMatrix)
      updatePermissionMatrix(workspaceId, localMatrix)
    },
    { manual: true }
  )

  const { run: resetDefaults, loading: resetting } = useRequest(
    async () => {
      const defaults: Record<string, number[]> = {}
      for (const row of PERMISSION_ROWS) {
        defaults[row.key] = [...(DEFAULT_PERMISSION_MATRIX[row.key] || [])]
      }
      await WorkspaceService.updatePermissionMatrix(workspaceId, defaults)
      updatePermissionMatrix(workspaceId, defaults)
      setLocalMatrix(defaults)
    },
    { manual: true }
  )

  function toggleRole(permissionKey: string, role: TeamRoleEnum) {
    setLocalMatrix(prev => {
      const roles = [...(prev[permissionKey] || [])]
      const idx = roles.indexOf(role)
      if (idx >= 0) {
        roles.splice(idx, 1)
      } else {
        roles.push(role)
        roles.sort((a, b) => a - b)
      }
      return { ...prev, [permissionKey]: roles }
    })
  }

  function hasRole(permissionKey: string, role: TeamRoleEnum): boolean {
    const roles = localMatrix[permissionKey] || DEFAULT_PERMISSION_MATRIX[permissionKey] || []
    return roles.includes(role)
  }

  return (
    <section id="permissions" className="border-accent-light border-b py-10">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{t('settings.permissions.title')}</h2>
        {!isOwner && (
          <Tooltip label={t('settings.permissions.readOnlyTip')}>
            <IconLock className="text-secondary h-4 w-4" />
          </Tooltip>
        )}
      </div>
      <p className="text-secondary mt-1 text-sm">{t('settings.permissions.description')}</p>

      <div
        className={cn('border-primary/10 mt-6 overflow-hidden rounded-lg border', {
          'opacity-70': !isOwner
        })}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-accent-light/60 border-primary/10 border-b">
              <th className="text-secondary px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                {t('settings.permissions.table.permission')}
              </th>
              <th className="text-secondary w-28 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                {t('settings.permissions.table.admin')}
              </th>
              <th className="text-secondary w-32 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                {t('settings.permissions.table.collaborator')}
              </th>
              <th className="text-secondary w-24 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                {t('settings.permissions.table.member')}
              </th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group, groupIdx) => (
              <>
                <tr
                  key={`group-${group.key}`}
                  className={cn('bg-accent-light/20', {
                    'border-primary/10 border-t': groupIdx > 0
                  })}
                >
                  <td
                    colSpan={4}
                    className="text-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                  >
                    {t(group.labelKey)}
                  </td>
                </tr>
                {PERMISSION_ROWS.filter(r => r.group === group.key).map((row, rowIdx, arr) => (
                  <tr
                    key={row.key}
                    className={cn('hover:bg-accent-light/10 transition-colors', {
                      'border-primary/10 border-b': rowIdx < arr.length - 1
                    })}
                  >
                    <td className="px-4 py-3 text-sm">{t(row.labelKey)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Switch
                          value={hasRole(row.key, TeamRoleEnum.ADMIN)}
                          disabled={!isOwner}
                          onChange={() => toggleRole(row.key, TeamRoleEnum.ADMIN)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Switch
                          value={hasRole(row.key, TeamRoleEnum.COLLABORATOR)}
                          disabled={!isOwner}
                          onChange={() => toggleRole(row.key, TeamRoleEnum.COLLABORATOR)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Switch
                          value={hasRole(row.key, TeamRoleEnum.MEMBER)}
                          disabled={!isOwner}
                          onChange={() => toggleRole(row.key, TeamRoleEnum.MEMBER)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div className="mt-6 flex items-center gap-3">
          <Button.Ghost
            size="md"
            disabled={!hasChanges || resetting}
            loading={resetting}
            onClick={resetDefaults}
          >
            {t('settings.permissions.resetDefaults')}
          </Button.Ghost>
          <Button
            size="md"
            disabled={!hasChanges || saving}
            loading={saving}
            onClick={savePermissions}
          >
            {t('settings.permissions.save')}
          </Button>
        </div>
      )}
    </section>
  )
}
