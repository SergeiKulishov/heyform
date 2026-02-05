import { BadRequestException } from '@nestjs/common'
import { CaptchaKindEnum, FormStatusEnum } from '@voxly/shared-types-enums'

import { Auth, ProjectGuard, Team, User } from '@decorator'
import { UseTemplateInput } from '@graphql'
import { TeamModel, UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, TemplateService } from '@service'
import { helper } from '@voxly/utils'

@Resolver()
@Auth()
export class UseTemplateResolver {
  constructor(
    private readonly formService: FormService,
    private readonly templateService: TemplateService
  ) {}

  @Mutation(returns => String)
  @ProjectGuard()
  async useTemplate(
    @Team() team: TeamModel,
    @User() user: UserModel,
    @Args('input') input: UseTemplateInput
  ): Promise<string> {
    const template = await this.templateService.findById(input.templateId)

    if (helper.isEmpty(template)) {
      throw new BadRequestException('The template does not exist')
    }

    const form = {
      teamId: team.id,
      projectId: input.projectId,
      memberId: user.id,
      name: template.name,
      kind: template.kind,
      interactiveMode: template.interactiveMode,
      fields: [],
      _drafts: JSON.stringify(template.fields),
      fieldsUpdatedAt: 0,
      settings: {
        active: false,
        captchaKind: CaptchaKindEnum.NONE,
        filterSpam: false,
        allowArchive: true,
        requirePassword: false,
        locale: 'en',
        enableQuestionList: true,
        enableNavigationArrows: true,
        enableEmailNotification: true
      },
      themeSettings: template.themeSettings,
      hiddenFields: [],
      version: 0,
      status: FormStatusEnum.NORMAL
    }

    const formId = await this.formService.create(form)
    await this.templateService.updateUsedCount(input.templateId)
    return formId
  }
}
