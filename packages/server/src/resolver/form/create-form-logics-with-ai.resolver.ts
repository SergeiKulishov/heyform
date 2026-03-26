import { Auth, FormGuard, Roles } from '@decorator'
import { CreateFieldsWithAIInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { AiService, FormService } from '@service'
import GraphQLJSON from 'graphql-type-json'

@Resolver()
@Auth()
export class CreateFormLogicsWithAIResolver {
  constructor(
    private readonly formService: FormService,
    private readonly aiService: AiService
  ) {}

  @Mutation(returns => GraphQLJSON)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async createFormLogicsWithAI(@Args('input') input: CreateFieldsWithAIInput): Promise<any[]> {
    const form = await this.formService.findById(input.formId)
    const fields = JSON.parse((form as any)._drafts || '[]')

    const logics = await this.aiService.generateFormLogics(fields, input.prompt)

    await this.formService.update(input.formId, { logics })

    return logics
  }
}
