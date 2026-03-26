import { Auth, FormGuard, Roles } from '@decorator'
import { DeleteSubmissionInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { SubmissionService } from '@service'

@Resolver()
@Auth()
export class DeleteSubmissionResolver {
  constructor(private readonly submissionService: SubmissionService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN)
  async deleteSubmissions(@Args('input') input: DeleteSubmissionInput): Promise<boolean> {
    return this.submissionService.deleteByIds(input.formId, input.submissionIds)
  }
}
