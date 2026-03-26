import { BadRequestException } from '@nestjs/common'

import { Auth, Roles, Team, TeamGuard } from '@decorator'
import { UpdateTeamMemberInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { TeamService } from '@service'

@Resolver()
@Auth()
export class UpdateTeamMemberRoleResolver {
  constructor(private readonly teamService: TeamService) {}

  @Mutation(returns => Boolean)
  @TeamGuard()
  @Roles(TeamRoleEnum.OWNER)
  async updateTeamMemberRole(
    @Team() team: TeamModel,
    @Args('input') input: UpdateTeamMemberInput
  ): Promise<boolean> {
    if (input.memberId === team.ownerId) {
      throw new BadRequestException('Cannot change the role of the workspace owner')
    }

    if (input.role === TeamRoleEnum.OWNER) {
      throw new BadRequestException('Use transferTeam to transfer ownership')
    }

    const member = await this.teamService.findMemberById(input.teamId, input.memberId)

    if (!member) {
      throw new BadRequestException('The workspace member does not exist')
    }

    return this.teamService.updateMember(input.teamId, input.memberId, {
      role: input.role
    })
  }
}
