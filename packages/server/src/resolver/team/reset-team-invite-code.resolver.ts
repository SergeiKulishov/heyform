import { PermissionKey } from '@common/permission'

import { Auth, RequirePermission, Team, TeamGuard } from '@decorator'
import { TeamDetailInput } from '@graphql'
import { TeamModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { TeamService } from '@service'

@Resolver()
@Auth()
export class ResetTeamInviteCodeResolver {
  constructor(private readonly teamService: TeamService) {}

  @Mutation(() => Boolean)
  @TeamGuard()
  @RequirePermission(PermissionKey.WORKSPACE_MEMBERS_INVITE)
  async resetTeamInviteCode(
    @Team() team: TeamModel,
    @Args('input') input: TeamDetailInput
  ): Promise<boolean> {
    await this.teamService.resetInviteCode(input.teamId)
    return true
  }
}
