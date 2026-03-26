import { Auth, FormGuard, Roles } from '@decorator'
import { UpdateSubmissionsCategoryInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { SubmissionService } from '@service'

@Resolver()
@Auth()
export class UpdateSubmissionsCategoryResolver {
  constructor(private readonly submissionService: SubmissionService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async updateSubmissionsCategory(
    @Args('input') input: UpdateSubmissionsCategoryInput
  ): Promise<boolean> {
    return this.submissionService.updateCategory(input)
  }
}
