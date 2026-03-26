import { Auth, FormGuard, Roles } from '@decorator'
import { IntegrationInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { IntegrationService } from '@service'

@Resolver()
@Auth()
export class DeleteIntegrationSettingsResolver {
  constructor(private readonly integrationService: IntegrationService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN)
  async deleteIntegrationSettings(
    @Args('input')
    input: IntegrationInput
  ): Promise<boolean> {
    return this.integrationService.delete(input.formId, input.appId)
  }
}
