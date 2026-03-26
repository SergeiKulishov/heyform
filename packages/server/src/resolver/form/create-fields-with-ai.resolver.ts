import { FieldKindEnum } from '@voxly/shared-types-enums'

import { Auth, FormGuard, Roles } from '@decorator'
import { CreateFieldsWithAIInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { AiService, FormService } from '@service'
import GraphQLJSON from 'graphql-type-json'

@Resolver()
@Auth()
export class CreateFieldsWithAIResolver {
  constructor(
    private readonly formService: FormService,
    private readonly aiService: AiService
  ) {}

  @Mutation(returns => GraphQLJSON)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async createFieldsWithAI(@Args('input') input: CreateFieldsWithAIInput): Promise<any[]> {
    const form = await this.formService.findById(input.formId)
    const existing = JSON.parse((form as any)._drafts || '[]')

    // Keep THANK_YOU/WELCOME fields — pass only question fields to AI
    const preserved = existing.filter(
      (f: any) => f.kind === FieldKindEnum.THANK_YOU || f.kind === FieldKindEnum.WELCOME
    )
    const questionFields = existing.filter(
      (f: any) => f.kind !== FieldKindEnum.THANK_YOU && f.kind !== FieldKindEnum.WELCOME
    )

    const editedFields = await this.aiService.editFormFields(
      questionFields,
      input.prompt,
      input.history as Array<{ role: 'user' | 'assistant'; content: string }> | undefined
    )

    if (!editedFields || editedFields.length === 0) {
      throw new Error('AI returned no fields — form was not modified')
    }

    const merged = [...editedFields, ...preserved]

    await this.formService.update(input.formId, {
      _drafts: JSON.stringify(merged)
    })

    return merged
  }
}
