import { PermissionKey } from '@common/permission'

import { Auth, ProjectGuard, RequirePermission, Team } from '@decorator'
import { RenameProjectInput } from '@graphql'
import { TeamModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { ProjectService } from '@service'

@Resolver()
@Auth()
export class RenameProjectResolver {
  constructor(private readonly projectService: ProjectService) {}

  @ProjectGuard()
  @RequirePermission(PermissionKey.PROJECT_CREATE)
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
