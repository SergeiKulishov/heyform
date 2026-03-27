export enum TeamRoleEnum {
  OWNER = 0,
  ADMIN = 1,
  COLLABORATOR = 2,
  MEMBER = 3
}

export const ROLE_LABELS: Record<number, string> = {
  [TeamRoleEnum.OWNER]: 'members.owner',
  [TeamRoleEnum.ADMIN]: 'members.admin',
  [TeamRoleEnum.COLLABORATOR]: 'members.collaborator',
  [TeamRoleEnum.MEMBER]: 'members.member'
}

export enum PermissionKey {
  WORKSPACE_SETTINGS = 'workspace.settings',
  WORKSPACE_MEMBERS_INVITE = 'workspace.members.invite',
  WORKSPACE_MEMBERS_REMOVE = 'workspace.members.remove',
  WORKSPACE_MEMBERS_ROLE = 'workspace.members.role',
  WORKSPACE_BRANDING = 'workspace.branding',
  PROJECT_CREATE = 'project.create',
  PROJECT_DELETE = 'project.delete',
  PROJECT_MEMBERS = 'project.members',
  FORM_CREATE = 'form.create',
  FORM_EDIT = 'form.edit',
  FORM_DELETE = 'form.delete',
  FORM_PUBLISH = 'form.publish',
  SUBMISSION_VIEW = 'submission.view',
  SUBMISSION_EDIT = 'submission.edit',
  SUBMISSION_DELETE = 'submission.delete',
  INTEGRATION_MANAGE = 'integration.manage'
}

export const DEFAULT_PERMISSION_MATRIX: Record<string, number[]> = {
  [PermissionKey.WORKSPACE_SETTINGS]: [TeamRoleEnum.ADMIN],
  [PermissionKey.WORKSPACE_MEMBERS_INVITE]: [TeamRoleEnum.ADMIN],
  [PermissionKey.WORKSPACE_MEMBERS_REMOVE]: [TeamRoleEnum.ADMIN],
  [PermissionKey.WORKSPACE_MEMBERS_ROLE]: [],
  [PermissionKey.WORKSPACE_BRANDING]: [TeamRoleEnum.ADMIN],
  [PermissionKey.PROJECT_CREATE]: [TeamRoleEnum.ADMIN],
  [PermissionKey.PROJECT_DELETE]: [],
  [PermissionKey.PROJECT_MEMBERS]: [TeamRoleEnum.ADMIN],
  [PermissionKey.FORM_CREATE]: [TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR],
  [PermissionKey.FORM_EDIT]: [TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR],
  [PermissionKey.FORM_DELETE]: [TeamRoleEnum.ADMIN],
  [PermissionKey.FORM_PUBLISH]: [TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR],
  [PermissionKey.SUBMISSION_VIEW]: [
    TeamRoleEnum.ADMIN,
    TeamRoleEnum.COLLABORATOR,
    TeamRoleEnum.MEMBER
  ],
  [PermissionKey.SUBMISSION_EDIT]: [TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR],
  [PermissionKey.SUBMISSION_DELETE]: [TeamRoleEnum.ADMIN],
  [PermissionKey.INTEGRATION_MANAGE]: [TeamRoleEnum.ADMIN]
}
