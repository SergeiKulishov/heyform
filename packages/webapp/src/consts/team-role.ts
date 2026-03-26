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
