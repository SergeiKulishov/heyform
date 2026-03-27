import { PermissionKey } from '@common/permission'

import { Auth, FormGuard, RequirePermission } from '@decorator'
import { CreateFormThemeWithAIInput } from '@graphql'
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
  @RequirePermission(PermissionKey.FORM_EDIT)
  async createFormThemeWithAI(@Args('input') input: CreateFormThemeWithAIInput): Promise<any> {
    const themeUpdates = await this.aiService.generateFormTheme(input.theme, input.prompt)

    if (Object.keys(themeUpdates).length > 0) {
      await this.formService.update(input.formId, { themeSettings: themeUpdates })
    }

    return themeUpdates
  }
}
