import { BadRequestException } from '@nestjs/common'

import { Auth, User } from '@decorator'
import { DeleteTeamTemplateInput, TeamTemplatesInput, TemplateType } from '@graphql'
import { UserModel } from '@model'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { TeamService, TemplateService } from '@service'
import { helper } from '@voxly/utils'

@Resolver()
@Auth()
export class TeamTemplatesResolver {
  constructor(
    private readonly templateService: TemplateService,
    private readonly teamService: TeamService
  ) {}

  @Query(returns => [TemplateType])
  async teamTemplates(
    @User() user: UserModel,
    @Args('input') input: TeamTemplatesInput
  ): Promise<TemplateType[]> {
    // Check if user is a member of the team
    const member = await this.teamService.findMemberById(input.teamId, user.id)

    if (helper.isEmpty(member)) {
      throw new BadRequestException('You are not authorized to view templates for this workspace')
    }

    const templates = await this.templateService.findByTeam(input.teamId, input.keyword)

    return templates.map(template => ({
      id: template._id.toString(),
      name: template.name,
      teamId: template.teamId,
      memberId: template.memberId,
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

  @Mutation(returns => Boolean)
  async deleteTeamTemplate(
    @User() user: UserModel,
    @Args('input') input: DeleteTeamTemplateInput
  ): Promise<boolean> {
    // Check if user is a member of the team
    const member = await this.teamService.findMemberById(input.teamId, user.id)

    if (helper.isEmpty(member)) {
      throw new BadRequestException('You are not authorized to delete templates for this workspace')
    }

    return this.templateService.delete(input.templateId, input.teamId)
  }
}
