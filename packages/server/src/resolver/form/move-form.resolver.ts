import { Auth, FormGuard, Roles, Team, User } from '@decorator'
import { MoveFormInput } from '@graphql'
import { TeamModel, TeamRoleEnum, UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, ProjectService } from '@service'

@Resolver()
@Auth()
export class MoveFormResolver {
  constructor(
    private readonly projectService: ProjectService,
    private readonly formService: FormService
  ) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async moveForm(
    @Team() team: TeamModel,
    @User() user: UserModel,
    @Args('input') input: MoveFormInput
  ): Promise<boolean> {
    const member = await this.projectService.findProjectByMemberId(user.id, input.targetProjectId)

    if (member) {
      const project = await this.projectService.findOne({
        _id: input.targetProjectId,
        teamId: team.id
      })

      if (project) {
        return this.formService.update(input.formId, {
          projectId: input.targetProjectId
        })
      }
    }

    return false
  }
}
