import { FieldKindEnum, STATEMENT_FIELD_KINDS } from '@voxly/shared-types-enums'

import { Auth, Form, FormGuard } from '@decorator'
import { FormDetailInput, FormReportType } from '@graphql'
import { FormModel } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormReportService, SubmissionService } from '@service'
import { flattenFields } from '@voxly/answer-utils'

const EXCLUDE_KINDS = [
  FieldKindEnum.GROUP,

  ...STATEMENT_FIELD_KINDS,

  FieldKindEnum.YES_NO,
  FieldKindEnum.MULTIPLE_CHOICE,
  FieldKindEnum.PICTURE_CHOICE,
  FieldKindEnum.LEGAL_TERMS,

  FieldKindEnum.RATING,
  FieldKindEnum.OPINION_SCALE,

  'custom_single',
  'custom_multiple'
]

@Resolver()
@Auth()
export class FormReportResolver {
  constructor(
    private readonly formReportService: FormReportService,
    private readonly submissionService: SubmissionService
  ) {}

  @Query(returns => FormReportType)
  @FormGuard()
  async formReport(
    @Form() form: FormModel,
    @Args('input') input: FormDetailInput
  ): Promise<FormReportType> {
    const fieldIds = flattenFields(form.fields)
      .filter(field => !EXCLUDE_KINDS.includes(field.kind))
      .map(field => field.id)

    const [result, submissions] = await Promise.all([
      this.formReportService.findById(input.formId),
      this.submissionService.findAllGroupInFieldIds(input.formId, fieldIds)
    ])

    return {
      responses: result?.responses || [],
      submissions
    } as any
  }
}
