import { SubmissionStatusEnum } from '@heyform-inc/shared-types-enums'
import { Body, Controller, Post, Req } from '@nestjs/common'
import { Request } from 'express'

import { applyLogicToFields, fieldValuesToAnswers, flattenFields } from '@heyform-inc/answer-utils'
import { timestamp } from '@heyform-inc/utils'
import { FormService, SubmissionService } from '@service'
import { parseUserAgent } from '@utils'

interface PartialSubmissionDto {
  formId: string
  sessionId: string
  answers: Record<string, any>
  lastFieldId?: string
  lastFieldIndex?: number
  hiddenFields?: Array<{ id: string; name: string; value?: string }>
}

@Controller()
export class PartialSubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly formService: FormService
  ) {}

  /**
   * REST endpoint for sendBeacon partial submissions
   * sendBeacon cannot use GraphQL, so we need a simple REST endpoint
   */
  @Post('/api/partial-submission')
  async savePartialSubmission(
    @Body() body: PartialSubmissionDto,
    @Req() req: Request
  ): Promise<{ success: boolean }> {
    // Validate required fields
    if (!body.formId || !body.sessionId) {
      return { success: false }
    }

    // Check if user has any answers
    if (!body.answers || Object.keys(body.answers).length === 0) {
      return { success: false }
    }

    const form = await this.formService.findById(body.formId)
    if (!form || form.suspended || form.settings?.active !== true) {
      return { success: false }
    }

    // Get client info
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || ''
    const userAgentString = req.headers['user-agent'] || ''
    const userAgent = parseUserAgent(userAgentString)

    // Process answers through logic
    let answers = []
    let variables = []

    try {
      const { fields, variables: variableValues } = applyLogicToFields(
        flattenFields(form.fields, true),
        form.logics,
        form.variables,
        body.answers
      )

      answers = fieldValuesToAnswers(fields, body.answers, true)
      variables = form.variables?.map(variable => ({
        ...variable,
        value: variableValues[variable.id]
      }))
    } catch {
      // If logic processing fails, just save raw answers
      answers = Object.entries(body.answers).map(([id, value]) => ({
        id,
        value
      }))
    }

    const endAt = timestamp()

    // Check for existing partial submission with same session
    const existingSubmission = await this.submissionService.findBySessionId(
      body.formId,
      body.sessionId
    )

    if (existingSubmission && !existingSubmission.isCompleted) {
      // Update existing partial submission
      await this.submissionService.updatePartial(existingSubmission.id, {
        answers,
        hiddenFields: (body.hiddenFields || []).map(hf => ({
          id: hf.id,
          name: hf.name,
          value: hf.value || ''
        })),
        variables,
        lastFieldId: body.lastFieldId,
        lastFieldIndex: body.lastFieldIndex,
        endAt
      })
    } else {
      // Create new partial submission
      await this.submissionService.create({
        teamId: form.teamId,
        formId: form.id,
        title: form.name,
        answers,
        hiddenFields: body.hiddenFields || [],
        variables: variables || [],
        startAt: endAt, // We don't have the real startAt in sendBeacon
        endAt,
        ip,
        userAgent,
        status: SubmissionStatusEnum.PARTIAL,
        sessionId: body.sessionId,
        lastFieldId: body.lastFieldId,
        lastFieldIndex: body.lastFieldIndex,
        isCompleted: false
      })
    }

    return { success: true }
  }
}
