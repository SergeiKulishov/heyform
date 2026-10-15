import { PermissionKey } from '@common/permission'

import { Auth, FormGuard, RequirePermission } from '@decorator'
import { ExportFormToJSONInput } from '@graphql'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormService } from '@service'
import { pickObject } from '@voxly/utils'
import { GraphQLJSONObject } from 'graphql-type-json'

@Resolver()
@Auth()
export class ExportFormResolver {
  constructor(private readonly formService: FormService) {}

  @Query(returns => GraphQLJSONObject)
  @FormGuard()
  @RequirePermission(PermissionKey.FORM_EDIT)
  async exportForm(@Args('input') input: ExportFormToJSONInput): Promise<Record<string, any>> {
    const form = await this.formService.findById(input.formId)

    return {
      name: form.name,
      kind: form.kind,
      interactiveMode: form.interactiveMode,
      description: form.description,
      fields: (form as any).drafts || [],
      logics: form.logics || [],
      variables: form.variables || [],
      hiddenFields: form.hiddenFields || [],
      themeSettings: form.themeSettings,
      settings: pickObject(form.settings || {}, [
        'active',
        'enableExpirationDate',
        'expirationTimeZone',
        'enabledAt',
        'closedAt',
        'enableTimeLimit',
        'timeLimit',
        'captchaKind',
        'filterSpam',
        'enableQuotaLimit',
        'quotaLimit',
        'enableIpLimit',
        'ipLimitCount',
        'ipLimitTime',
        'enableProgress',
        'enableQuestionList',
        'enableNavigationArrows',
        'enablePartialSubmission',
        'partialSubmissionTTL',
        'locale',
        'languages',
        'enableClosedMessage',
        'closedFormTitle',
        'closedFormDescription',
        'allowArchive',
        'requirePassword',
        'enableEmailNotification',
        'redirectOnCompletion',
        'redirectUrl',
        'redirectDelay',
        'metaTitle',
        'metaDescription',
        'metaOGImageUrl'
      ])
    }
  }
}
