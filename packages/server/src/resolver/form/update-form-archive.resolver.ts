import { Auth, FormGuard, Roles, Team } from '@decorator'
import { UpdateFormArchiveInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, SubmissionService } from '@service'

@Resolver()
@Auth()
export class UpdateFormArchiveResolver {
  constructor(
    private readonly formService: FormService,
    private readonly submissionService: SubmissionService
  ) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async updateFormArchive(
    @Team() team: TeamModel,
    @Args('input') input: UpdateFormArchiveInput
  ): Promise<boolean> {
    if (!input.allowArchive) {
      await this.submissionService.deleteByIds(input.formId)
    }

    return await this.formService.update(input.formId, {
      'settings.allowArchive': input.allowArchive
    })
  }
}
