import { PermissionKey } from '@common/permission'
import { BadRequestException } from '@nestjs/common'

import { Auth, Roles, Team, TeamGuard } from '@decorator'
import { UpdatePermissionMatrixInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { TeamService } from '@service'

@Resolver()
@Auth()
export class UpdatePermissionMatrixResolver {
  constructor(private readonly teamService: TeamService) {}

  @Mutation(returns => Boolean)
  @TeamGuard()
  @Roles(TeamRoleEnum.OWNER)
  async updatePermissionMatrix(
    @Team() team: TeamModel,
    @Args('input') input: UpdatePermissionMatrixInput
  ): Promise<boolean> {
    const matrix = input.permissionMatrix

    for (const [key, roles] of Object.entries(matrix)) {
      if (!Object.values(PermissionKey).includes(key as PermissionKey)) {
        throw new BadRequestException(`Invalid permission key: ${key}`)
      }

      if (!Array.isArray(roles)) {
        throw new BadRequestException(`Permission value for ${key} must be an array`)
      }

      for (const role of roles) {
        if (![TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR, TeamRoleEnum.MEMBER].includes(role)) {
          throw new BadRequestException(`Invalid role value: ${role}`)
        }
      }
    }

    return this.teamService.update(team.id, {
      permissionMatrix: matrix
    })
  }
}
