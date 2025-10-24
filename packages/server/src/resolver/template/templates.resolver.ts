import { Auth } from '@decorator'
import { TemplateType, TemplatesInput } from '@graphql'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { TemplateService } from '@service'

@Resolver()
@Auth()
export class TemplatesResolver {
  constructor(private readonly templateService: TemplateService) {}

  @Query(returns => [TemplateType])
  async templates(
    @Args('input', { nullable: true }) input?: TemplatesInput
  ): Promise<TemplateType[]> {
    const templates = await this.templateService.findAll(input?.keyword, input?.limit)
    return templates.map(template => ({
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
      published: template.published
    }))
  }
}
