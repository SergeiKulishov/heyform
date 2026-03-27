import { PermissionKey } from '@common/permission'

import { Auth, FormGuard, RequirePermission } from '@decorator'
import { UpdateFormVariablesInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService } from '@service'

@Resolver()
@Auth()
export class UpdateFormVariablesResolver {
  constructor(private readonly formService: FormService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @RequirePermission(PermissionKey.FORM_EDIT)
  async updateFormVariables(@Args('input') input: UpdateFormVariablesInput): Promise<boolean> {
    return this.formService.update(input.formId, {
      variables: input.variables
    })
  }
}
