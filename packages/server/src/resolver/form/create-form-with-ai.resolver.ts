import { PermissionKey } from '@common/permission'
import {
  CaptchaKindEnum,
  FieldKindEnum,
  FormKindEnum,
  FormStatusEnum,
  InteractiveModeEnum
} from '@voxly/shared-types-enums'

import { Auth, ProjectGuard, RequirePermission, Team, User } from '@decorator'
import { CreateFormWithAIInput } from '@graphql'
import { TeamModel, UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { AiService, FormService } from '@service'
import { nanoid } from '@voxly/utils'

@Resolver()
@Auth()
export class CreateFormWithAIResolver {
  constructor(
    private readonly formService: FormService,
    private readonly aiService: AiService
  ) {}

  @Mutation(returns => String)
  @ProjectGuard()
  @RequirePermission(PermissionKey.FORM_CREATE)
  async createFormWithAI(
    @Team() team: TeamModel,
    @User() user: UserModel,
    @Args('input') input: CreateFormWithAIInput
  ): Promise<string> {
    const aiFields = await this.aiService.generateFormFields(input.topic, input.reference)

    const fields = [
      ...aiFields,
      {
        id: nanoid(12),
        kind: FieldKindEnum.THANK_YOU,
        title: ['Thank you!'],
        description: ['Thanks for completing this form.'],
        validations: { required: false }
      }
    ]

    return await this.formService.create({
      teamId: team.id,
      memberId: user.id,
      projectId: input.projectId,
      name: input.topic.slice(0, 50),
      topic: input.topic,
      reference: input.reference,
      generatedAt: Date.now(),
      fields: [],
      _drafts: JSON.stringify(fields),
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
      hiddenFields: [],
      version: 0,
      status: FormStatusEnum.NORMAL,
      interactiveMode: InteractiveModeEnum.GENERAL,
      kind: FormKindEnum.SURVEY
    })
  }
}
