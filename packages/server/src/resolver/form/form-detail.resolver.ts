import { Auth, FormGuard, Public, Team } from '@decorator'
import { FormDetailInput, FormType, PublicFormType } from '@graphql'
import { FormModel, TeamModel } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormService, SubmissionService } from '@service'
import { date } from '@voxly/utils'

@Resolver()
@Auth()
export class FormDetailResolver {
  constructor(
    private readonly formService: FormService,
    private readonly submissionService: SubmissionService
  ) {}

  @Query(returns => FormType)
  @FormGuard()
  async formDetail(
    @Team() team: TeamModel,
    @Args('input') input: FormDetailInput
  ): Promise<FormModel> {
    const [form, submissionCount] = await Promise.all([
      this.formService.findById(input.formId),
      this.submissionService.count({ formId: input.formId })
    ])

    //@ts-ignore
    form.updatedAt = date(form.get('updatedAt')).unix()

    //@ts-ignore
    form.submissionCount = submissionCount

    return form
  }

  @Query(returns => PublicFormType)
  @Public()
  async publicForm(@Args('input') input: FormDetailInput): Promise<PublicFormType> {
    const form = await this.formService.findPublicForm(input.formId)

    if (!form) {
      throw new Error('Form not found')
    }

    if (!form.teamId) {
      throw new Error('Form teamId is required')
    }

    if (!form.projectId) {
      throw new Error('Form projectId is required')
    }

    const integrations: Record<string, any> = {}

    if (form.settings?.active) {
      // const apps = await this.appService.findAllByUniqueIds(['googleanalytics', 'facebookpixel'])
      // const result = await this.integrationService.findAllInFormByApps(
      //   input.formId,
      //   apps.map(app => app.id)
      // )
      // for (const row of result) {
      //   const app = apps.find(app => app.id === row.appId)
      //   integrations[app.uniqueId] = (row.attributes as any).get('trackingCode')
      // }
    }

    return {
      id: form.id,
      teamId: form.teamId,
      projectId: form.projectId,
      memberId: form.memberId,
      name: form.name,
      description: form.description,
      interactiveMode: form.interactiveMode,
      kind: form.kind,
      settings: form.settings,
      drafts: form.drafts || form.fields || [],
      fields: form.fields || [],
      translations: form.translations || {},
      hiddenFields: form.hiddenFields || [],
      logics: form.logics || [],
      variables: form.variables || [],
      fieldsUpdatedAt: form.fieldsUpdatedAt || Date.now(),
      themeSettings: form.themeSettings || {},
      retentionAt: form.retentionAt,
      suspended: form.suspended || false,
      isDraft: form.isDraft || false,
      status: form.status,
      stripeAccount: form.stripeAccount,
      version: form.version || 1,
      canPublish: form.canPublish || false,
      customReport: form.customReport || {
        id: '',
        hiddenFields: [],
        theme: {},
        enablePublicAccess: false
      },
      integrations
    }
  }
}
