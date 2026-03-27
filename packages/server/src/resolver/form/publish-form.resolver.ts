import { PermissionKey } from '@common/permission'
import { BadRequestException, HttpStatus } from '@nestjs/common'

import { Auth, FormGuard, RequirePermission, Team, User } from '@decorator'
import { UpdateFormSchemasInput } from '@graphql'
import { TeamModel, UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, UserService } from '@service'
import { helper, timestamp } from '@voxly/utils'

@Resolver()
@Auth()
export class PublishFormResolver {
  constructor(
    private readonly formService: FormService,
    private readonly userService: UserService
  ) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @RequirePermission(PermissionKey.FORM_PUBLISH)
  async publishForm(
    @Team() team: TeamModel,
    @User() user: UserModel,
    @Args('input') input: UpdateFormSchemasInput
  ): Promise<boolean> {
    const form = await this.formService.findById(input.formId)

    if (form.version > input.version) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'invalid_draft_version',
        message: 'The version provided is not valid'
      })
    }

    const updates: Record<string, any> = {
      fields: input.drafts,
      _drafts: JSON.stringify(input.drafts),
      fieldsUpdatedAt: timestamp(),
      version: input.version,
      'settings.active': true
    }

    if (!form.publishedAt) {
      updates.publishedAt = updates.fieldsUpdatedAt
    }

    if (helper.isValidArray(form.settings?.languages)) {
      this.formService.addTranslateQueue(input.formId, form.settings!.languages)
    }

    if (!user.hasPublishedForm) {
      await this.userService.update(user.id, {
        publishedFormAt: timestamp()
      })
    }

    return this.formService.update(input.formId, updates)
  }
}
