import { BadRequestException } from '@nestjs/common'

import { Auth, User } from '@decorator'
import { SaveAsTemplateInput } from '@graphql'
import { helper } from '@heyform-inc/utils'
import { UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, TeamService, TemplateService } from '@service'

@Resolver()
@Auth()
export class SaveAsTemplateResolver {
  constructor(
    private readonly formService: FormService,
    private readonly templateService: TemplateService,
    private readonly teamService: TeamService
  ) {}

  @Mutation(returns => String)
  async saveFormAsTemplate(
    @User() user: UserModel,
    @Args('input') input: SaveAsTemplateInput
  ): Promise<string> {
    const form = await this.formService.findById(input.formId)

    if (helper.isEmpty(form)) {
      throw new BadRequestException('Form not found')
    }

    // Check if user is a member of the team
    const member = await this.teamService.findMemberById(form.teamId, user.id)

    if (helper.isEmpty(member)) {
      throw new BadRequestException('You are not authorized to save this form as a template')
    }

    // Get fields from drafts or published fields
    const fields = form._drafts ? JSON.parse(form._drafts) : form.fields

    // Create template
    return this.templateService.create({
      teamId: form.teamId,
      memberId: user.id,
      name: input.name,
      category: input.category,
      description: input.description,
      fields,
      themeSettings: form.themeSettings,
      kind: form.kind,
      interactiveMode: form.interactiveMode
    })
  }
}
