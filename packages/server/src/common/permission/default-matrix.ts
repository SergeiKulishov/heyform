import { TeamRoleEnum } from '@model'

import { PermissionKey } from './permission-keys'

export const DEFAULT_PERMISSION_MATRIX: Record<PermissionKey, TeamRoleEnum[]> = {
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
