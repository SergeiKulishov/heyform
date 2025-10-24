import { BadRequestException } from '@nestjs/common'

import { Auth } from '@decorator'
import { TemplateDetailInput, TemplateDetailType } from '@graphql'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { TemplateService } from '@service'

@Resolver()
@Auth()
export class TemplateDetailResolver {
  constructor(private readonly templateService: TemplateService) {}

  @Query(returns => TemplateDetailType)
  async templateDetail(
    @Args('input') input: TemplateDetailInput
  ): Promise<TemplateDetailType | null> {
    let template

    if (input.templateId) {
      template = await this.templateService.findById(input.templateId)
    } else if (input.templateSlug) {
      template = await this.templateService.findBySlug(input.templateSlug)
    } else {
      throw new BadRequestException('Either templateId or templateSlug must be provided')
    }

    if (!template) {
      return null
    }

    return {
      id: template._id.toString(),
      name: template.name,
      recordId: template.recordId,
      slug: template.slug,
      thumbnail: template.thumbnail,
      category: template.category,
      description: template.description,
      interactiveMode: template.interactiveMode,
      kind: template.kind,
      themeSettings: template.themeSettings,
      usedCount: template.usedCount || 0,
      timeSaving: template.timeSaving,
      timeToComplete: template.timeToComplete,
      published: template.published,
      fields: template.fields,
      fieldUpdateAt: template.fieldsUpdatedAt
    }
  }
}
