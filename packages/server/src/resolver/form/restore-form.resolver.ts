import { FormStatusEnum } from '@voxly/shared-types-enums'

import { Auth, Form, FormGuard, Roles } from '@decorator'
import { FormDetailInput } from '@graphql'
import { FormModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService } from '@service'

@Resolver()
@Auth()
export class RestoreFormResolver {
  constructor(private readonly formService: FormService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async restoreForm(
    @Form() form: FormModel,
    @Args('input') input: FormDetailInput
  ): Promise<boolean> {
    return this.formService.update(input.formId, {
      retentionAt: -1,
      status: FormStatusEnum.NORMAL
    })
  }
}
