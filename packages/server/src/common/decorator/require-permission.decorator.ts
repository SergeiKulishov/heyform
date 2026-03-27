import { SetMetadata } from '@nestjs/common'

import { PermissionKey } from '../permission'

export const PERMISSION_KEY = 'requiredPermission'
export const RequirePermission = (permission: PermissionKey) =>
  SetMetadata(PERMISSION_KEY, permission)
