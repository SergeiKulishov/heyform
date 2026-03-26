import { Auth, FormGuard, Roles } from '@decorator'
import { UpdateFormVariablesInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService } from '@service'

@Resolver()
@Auth()
export class UpdateFormVariablesResolver {
  constructor(private readonly formService: FormService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async updateFormVariables(@Args('input') input: UpdateFormVariablesInput): Promise<boolean> {
    return this.formService.update(input.formId, {
      variables: input.variables
    })
  }
}
