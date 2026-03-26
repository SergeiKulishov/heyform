import { SetMetadata } from '@nestjs/common'

import { TeamRoleEnum } from '@model'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: TeamRoleEnum[]) => SetMetadata(ROLES_KEY, roles)
