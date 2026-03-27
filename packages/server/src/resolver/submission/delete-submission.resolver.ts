import { PermissionKey } from '@common/permission'

import { Auth, FormGuard, RequirePermission } from '@decorator'
import { DeleteSubmissionInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { SubmissionService } from '@service'

@Resolver()
@Auth()
export class DeleteSubmissionResolver {
  constructor(private readonly submissionService: SubmissionService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @RequirePermission(PermissionKey.SUBMISSION_DELETE)
  async deleteSubmissions(@Args('input') input: DeleteSubmissionInput): Promise<boolean> {
    return this.submissionService.deleteByIds(input.formId, input.submissionIds)
  }
}
