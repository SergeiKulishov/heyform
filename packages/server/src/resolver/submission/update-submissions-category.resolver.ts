import { PermissionKey } from '@common/permission'

import { Auth, FormGuard, RequirePermission } from '@decorator'
import { UpdateSubmissionsCategoryInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { SubmissionService } from '@service'

@Resolver()
@Auth()
export class UpdateSubmissionsCategoryResolver {
  constructor(private readonly submissionService: SubmissionService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @RequirePermission(PermissionKey.SUBMISSION_EDIT)
  async updateSubmissionsCategory(
    @Args('input') input: UpdateSubmissionsCategoryInput
  ): Promise<boolean> {
    return this.submissionService.updateCategory(input)
  }
}
