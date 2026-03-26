import { Auth, FormGuard, Roles } from '@decorator'
import { CreateFormThemeWithAIInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { AiService, FormService } from '@service'
import GraphQLJSON from 'graphql-type-json'

@Resolver()
@Auth()
export class CreateFormThemeWithAIResolver {
  constructor(
    private readonly formService: FormService,
    private readonly aiService: AiService
  ) {}

  @Mutation(returns => GraphQLJSON)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async createFormThemeWithAI(@Args('input') input: CreateFormThemeWithAIInput): Promise<any> {
    const themeUpdates = await this.aiService.generateFormTheme(input.theme, input.prompt)

    if (Object.keys(themeUpdates).length > 0) {
      await this.formService.update(input.formId, { themeSettings: themeUpdates })
    }

    return themeUpdates
  }
}
