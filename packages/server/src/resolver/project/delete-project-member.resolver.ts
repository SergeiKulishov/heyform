import { BadRequestException } from '@nestjs/common'

import { Auth, ProjectGuard, Roles, Team } from '@decorator'
import { ProjectMemberInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { ProjectService } from '@service'

@Resolver()
@Auth()
export class DeleteProjectMemberResolver {
  constructor(private readonly projectService: ProjectService) {}

  @ProjectGuard()
  @Roles(TeamRoleEnum.ADMIN)
  @Mutation(returns => Boolean)
  async deleteProjectMember(
    @Team() team: TeamModel,
    @Args('input') input: ProjectMemberInput
  ): Promise<boolean> {
    if (input.memberId === team.ownerId) {
      throw new BadRequestException("You don't have permission to remove member from the project")
    }

    return this.projectService.deleteMember(input.projectId, input.memberId)
  }
}
