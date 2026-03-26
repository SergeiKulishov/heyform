import { Auth, FormGuard, Roles } from '@decorator'
import { FormDetailInput } from '@graphql'
import { TeamRoleEnum } from '@model'
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
  @Roles(TeamRoleEnum.ADMIN)
  async deleteForm(@Args('input') input: FormDetailInput): Promise<boolean> {
    await this.formService.delete(input.formId)
    await this.submissionService.deleteAll(input.formId)
    return true
  }
}
