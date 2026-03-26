import { BadRequestException } from '@nestjs/common'

import { Auth, Roles, Team, TeamGuard } from '@decorator'
import { TransferTeamInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { ProjectService, TeamService } from '@service'

@Resolver()
@Auth()
export class RemoveTeamMemberResolver {
  constructor(
    private readonly teamService: TeamService,
    private readonly projectService: ProjectService
  ) {}

  @Mutation(returns => Boolean)
  @TeamGuard()
  @Roles(TeamRoleEnum.ADMIN)
  async removeTeamMember(
    @Team() team: TeamModel,
    @Args('input') input: TransferTeamInput
  ): Promise<boolean> {
    const member = await this.teamService.findMemberById(input.teamId, input.memberId)

    if (!member) {
      throw new BadRequestException('The member in the workspace does not exist')
    }

    if (input.memberId === team.ownerId) {
      throw new BadRequestException('This operation is not allowed in the workspace')
    }

    if (!team.isOwner && member.role <= team.role) {
      throw new BadRequestException('You can only remove members with a lower role')
    }

    await this.teamService.deleteMember(input.teamId, input.memberId)

    const projects = await this.projectService.findAllInTeam(input.teamId)
    if (projects.length > 0) {
      await this.projectService.deleteMemberInProjects(
        projects.map(row => row.id),
        input.memberId
      )
    }

    return true
  }
}
