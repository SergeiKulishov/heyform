import { Auth, FormGuard } from '@decorator'
import { AuditFormWithAIInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { AiService, FormService } from '@service'
import GraphQLJSON from 'graphql-type-json'

@Resolver()
@Auth()
export class AuditFormWithAIResolver {
  constructor(
    private readonly formService: FormService,
    private readonly aiService: AiService
  ) {}

  @Mutation(returns => GraphQLJSON)
  @FormGuard()
  async auditFormWithAI(@Args('input') input: AuditFormWithAIInput): Promise<any[]> {
    const form = await this.formService.findById(input.formId)
    const fields = JSON.parse((form as any)._drafts || '[]')
    return await this.aiService.auditFormFields(fields)
  }
}
