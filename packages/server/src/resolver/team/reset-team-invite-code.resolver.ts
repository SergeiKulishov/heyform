import { Auth, Roles, Team, TeamGuard } from '@decorator'
import { TeamDetailInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { TeamService } from '@service'

@Resolver()
@Auth()
export class ResetTeamInviteCodeResolver {
  constructor(private readonly teamService: TeamService) {}

  @Mutation(() => Boolean)
  @TeamGuard()
  @Roles(TeamRoleEnum.ADMIN)
  async resetTeamInviteCode(
    @Team() team: TeamModel,
    @Args('input') input: TeamDetailInput
  ): Promise<boolean> {
    await this.teamService.resetInviteCode(input.teamId)
    return true
  }
}
