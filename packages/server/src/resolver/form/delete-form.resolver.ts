import { PermissionKey } from '@common/permission'

import { Auth, FormGuard, RequirePermission } from '@decorator'
import { FormDetailInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, SubmissionService } from '@service'

@Resolver()
@Auth()
export class DeleteFormResolver {
  constructor(
    private readonly formService: FormService,
    private readonly submissionService: SubmissionService
  ) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @RequirePermission(PermissionKey.FORM_DELETE)
  async deleteForm(@Args('input') input: FormDetailInput): Promise<boolean> {
    await this.formService.delete(input.formId)
    await this.submissionService.deleteAll(input.formId)
    return true
  }
}
