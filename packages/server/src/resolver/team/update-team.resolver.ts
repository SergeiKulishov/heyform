import { Auth, Roles, Team, TeamGuard } from '@decorator'
import { UpdateTeamInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { TeamService } from '@service'
import { helper, pickValidValues } from '@voxly/utils'

@Resolver()
@Auth()
export class UpdateTeamResolver {
  constructor(private readonly teamService: TeamService) {}

  @Mutation(returns => Boolean)
  @TeamGuard()
  @Roles(TeamRoleEnum.ADMIN)
  async updateTeam(
    @Team() team: TeamModel,
    @Args('input') input: UpdateTeamInput
  ): Promise<boolean> {
    const updates: Record<string, any> = pickValidValues(input as any, ['name', 'avatar'])

    if (!helper.isNil(input.removeBranding)) {
      updates.removeBranding = input.removeBranding
    }

    if (input.customSharingURL !== undefined) {
      updates.customSharingURL = helper.isEmpty(input.customSharingURL)
        ? null
        : input.customSharingURL
    }

    return await this.teamService.update(input.teamId, updates)
  }
}
