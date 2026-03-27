import { PermissionKey } from '@common/permission'

import { Auth, FormGuard, RequirePermission } from '@decorator'
import { UpdateFormArchiveInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService } from '@service'

@Resolver()
@Auth()
export class FormArchiveResolver {
  constructor(private readonly formService: FormService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @RequirePermission(PermissionKey.FORM_EDIT)
  async formArchive(@Args('input') input: UpdateFormArchiveInput): Promise<boolean> {
    if (!input.allowArchive) {
    }

    return await this.formService.update(input.formId, {
      'settings.allowArchive': input.allowArchive
    })
  }
}
