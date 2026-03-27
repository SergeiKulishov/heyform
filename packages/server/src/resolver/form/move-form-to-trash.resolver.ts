import { PermissionKey } from '@common/permission'
import { FormStatusEnum } from '@voxly/shared-types-enums'

import { Auth, Form, FormGuard, RequirePermission } from '@decorator'
import { FormDetailInput } from '@graphql'
import { FormModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService } from '@service'
import { date } from '@voxly/utils'

@Resolver()
@Auth()
export class MoveFormToTrashResolver {
  constructor(private readonly formService: FormService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @RequirePermission(PermissionKey.FORM_EDIT)
  async moveFormToTrash(
    @Form() form: FormModel,
    @Args('input') input: FormDetailInput
  ): Promise<boolean> {
    return this.formService.update(input.formId, {
      retentionAt: date().add(30, 'day').unix(),
      'settings.active': false,
      status: FormStatusEnum.TRASH
    })
  }
}
