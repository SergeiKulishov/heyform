import { DEFAULT_PERMISSION_MATRIX, PermissionKey } from '@common/permission'

import { Auth, Team, TeamGuard } from '@decorator'
import { TeamDetailInput, TeamPermissionsType } from '@graphql'
import { TeamModel } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'

@Resolver()
@Auth()
export class TeamPermissionsResolver {
  @Query(returns => TeamPermissionsType)
  @TeamGuard()
  async teamPermissions(
    @Team() team: TeamModel,
    @Args('input') _input: TeamDetailInput
  ): Promise<{ permissions: Record<string, boolean> }> {
    const matrix = (team.permissionMatrix as Record<string, number[]>) || DEFAULT_PERMISSION_MATRIX
    const result: Record<string, boolean> = {}

    for (const key of Object.values(PermissionKey)) {
      if (team.isOwner) {
        result[key] = true
      } else {
        const allowedRoles = matrix[key] || DEFAULT_PERMISSION_MATRIX[key] || []
        result[key] = allowedRoles.includes(team.role)
      }
    }

    return { permissions: result }
  }
}
