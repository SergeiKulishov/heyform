import { TeamRoleEnum } from '@/consts/team-role'
import { WorkspaceType } from '@/types'

export function hasMinRole(
  workspace: WorkspaceType | undefined | null,
  minRole: TeamRoleEnum
): boolean {
  if (!workspace) return false
  if (workspace.isOwner) return true
  if (workspace.role === undefined || workspace.role === null) return false
  return workspace.role <= minRole
}

export function isWorkspaceOwner(workspace: WorkspaceType | undefined | null): boolean {
  return !!workspace?.isOwner
}

export function canManageSettings(workspace: WorkspaceType | undefined | null): boolean {
  return hasMinRole(workspace, TeamRoleEnum.ADMIN)
}

export function canManageMembers(workspace: WorkspaceType | undefined | null): boolean {
  return hasMinRole(workspace, TeamRoleEnum.ADMIN)
}

export function canInviteMembers(workspace: WorkspaceType | undefined | null): boolean {
  return hasMinRole(workspace, TeamRoleEnum.ADMIN)
}

export function canCreateProject(workspace: WorkspaceType | undefined | null): boolean {
  return hasMinRole(workspace, TeamRoleEnum.ADMIN)
}

export function canEditForms(workspace: WorkspaceType | undefined | null): boolean {
  return hasMinRole(workspace, TeamRoleEnum.COLLABORATOR)
}

export function canDeleteForms(workspace: WorkspaceType | undefined | null): boolean {
  return hasMinRole(workspace, TeamRoleEnum.ADMIN)
}

export function canChangeRoles(workspace: WorkspaceType | undefined | null): boolean {
  return isWorkspaceOwner(workspace)
}

export function canTransferOwnership(workspace: WorkspaceType | undefined | null): boolean {
  return isWorkspaceOwner(workspace)
}

export function canDissolveWorkspace(workspace: WorkspaceType | undefined | null): boolean {
  return isWorkspaceOwner(workspace)
}
