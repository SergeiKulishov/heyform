import { Auth, Form, FormGuard } from '@decorator'
import { UpdateFormInput } from '@graphql'
import { FormModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, SubmissionService } from '@service'
import { helper, pickValidValues } from '@voxly/utils'

@Resolver()
@Auth()
export class UpdateFormResolver {
  constructor(
    private readonly formService: FormService,
    private readonly submissionService: SubmissionService
  ) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  async updateForm(
    @Form() form: FormModel,
    @Args('input') input: UpdateFormInput
  ): Promise<boolean> {
    let updates: Record<string, any> = pickValidValues(input as any, [
      'name',
      ['active', 'settings.active'],
      ['enableExpirationDate', 'settings.enableExpirationDate'],
      ['expirationTimeZone', 'settings.expirationTimeZone'],
      ['enabledAt', 'settings.enabledAt'],
      ['closedAt', 'settings.closedAt'],
      ['enableTimeLimit', 'settings.enableTimeLimit'],
      ['timeLimit', 'settings.timeLimit'],
      ['captchaKind', 'settings.captchaKind'],
      ['filterSpam', 'settings.filterSpam'],
      ['enableQuotaLimit', 'settings.enableQuotaLimit'],
      ['quotaLimit', 'settings.quotaLimit'],
      ['enableIpLimit', 'settings.enableIpLimit'],
      ['ipLimitCount', 'settings.ipLimitCount'],
      ['ipLimitTime', 'settings.ipLimitTime'],
      ['enableProgress', 'settings.enableProgress'],
      ['enableQuestionList', 'settings.enableQuestionList'],
      ['enableNavigationArrows', 'settings.enableNavigationArrows'],
      ['enablePartialSubmission', 'settings.enablePartialSubmission'],
      ['partialSubmissionTTL', 'settings.partialSubmissionTTL'],
      ['locale', 'settings.locale'],
      ['languages', 'settings.languages'],
      ['enableClosedMessage', 'settings.enableClosedMessage'],
      ['closedFormTitle', 'settings.closedFormTitle'],
      ['closedFormDescription', 'settings.closedFormDescription'],
      ['allowArchive', 'settings.allowArchive'],
      ['password', 'settings.password'],
      ['requirePassword', 'settings.requirePassword'],
      ['enableEmailNotification', 'settings.enableEmailNotification']
    ])

    if (helper.isTrue(input.redirectOnCompletion)) {
      updates = {
        ...updates,
        ...pickValidValues(input as any, [
          ['redirectOnCompletion', 'settings.redirectOnCompletion'],
          ['redirectUrl', 'settings.redirectUrl'],
          ['redirectDelay', 'settings.redirectDelay']
        ])
      }
    }

    if (input.allowArchive === false) {
      await this.submissionService.deleteByIds(input.formId)
    }

    if (
      helper.isValidArray(input.languages) &&
      !input.languages.every(t => form.settings?.languages?.includes(t))
    ) {
      this.formService.addTranslateQueue(input.formId, input.languages!)
    }

    if (input.metaTitle || input.metaDescription || input.metaOGImageUrl) {
      updates = {
        ...updates,
        ...pickValidValues(input as any, [
          ['metaTitle', 'settings.metaTitle'],
          ['metaDescription', 'settings.metaDescription'],
          ['metaOGImageUrl', 'settings.metaOGImageUrl']
        ])
      }
    } else if (helper.isNull(input.metaOGImageUrl)) {
      updates['settings.metaOGImageUrl'] = null
    }

    return this.formService.update(input.formId, updates)
  }
}
