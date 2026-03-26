import { Auth, ProjectGuard, Roles, Team } from '@decorator'
import { RenameProjectInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { ProjectService } from '@service'

@Resolver()
@Auth()
export class RenameProjectResolver {
  constructor(private readonly projectService: ProjectService) {}

  @ProjectGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  @Mutation(returns => Boolean)
  async renameProject(
    @Team() team: TeamModel,
    @Args('input') input: RenameProjectInput
  ): Promise<boolean> {
    return this.projectService.update(input.projectId, {
      name: input.name
    })
  }
}
