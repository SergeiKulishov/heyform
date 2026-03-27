import { DEFAULT_PERMISSION_MATRIX, PermissionKey } from '@/consts/team-role'
import { WorkspaceType } from '@/types'

export function hasPermission(
  workspace: WorkspaceType | undefined | null,
  permission: PermissionKey
): boolean {
  if (!workspace) return false
  if (workspace.isOwner) return true
  if (workspace.role === undefined || workspace.role === null) return false

  const matrix = workspace.permissionMatrix || DEFAULT_PERMISSION_MATRIX
  const allowedRoles = matrix[permission] || DEFAULT_PERMISSION_MATRIX[permission] || []
  return allowedRoles.includes(workspace.role)
}

export function isWorkspaceOwner(ws: WorkspaceType | undefined | null): boolean {
  return !!ws?.isOwner
}

export function canManageSettings(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.WORKSPACE_SETTINGS)
}

export function canInviteMembers(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.WORKSPACE_MEMBERS_INVITE)
}

export function canManageMembers(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.WORKSPACE_MEMBERS_REMOVE)
}

export function canChangeRoles(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.WORKSPACE_MEMBERS_ROLE)
}

export function canCreateProject(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.PROJECT_CREATE)
}

export function canManageProjectMembers(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.PROJECT_MEMBERS)
}

export function canCreateForms(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.FORM_CREATE)
}

export function canEditForms(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.FORM_EDIT)
}

export function canDeleteForms(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.FORM_DELETE)
}

export function canPublishForms(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.FORM_PUBLISH)
}

export function canViewSubmissions(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.SUBMISSION_VIEW)
}

export function canEditSubmissions(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.SUBMISSION_EDIT)
}

export function canDeleteSubmissions(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.SUBMISSION_DELETE)
}

export function canManageIntegrations(ws: WorkspaceType | undefined | null): boolean {
  return hasPermission(ws, PermissionKey.INTEGRATION_MANAGE)
}

export function canTransferOwnership(ws: WorkspaceType | undefined | null): boolean {
  return isWorkspaceOwner(ws)
}

export function canDissolveWorkspace(ws: WorkspaceType | undefined | null): boolean {
  return isWorkspaceOwner(ws)
}
