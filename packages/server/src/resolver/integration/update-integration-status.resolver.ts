import { Auth, FormGuard, Roles } from '@decorator'
import { UpdateIntegrationStatusInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { IntegrationService } from '@service'

@Resolver()
@Auth()
export class UpdateIntegrationStatusResolver {
  constructor(private readonly integrationService: IntegrationService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN)
  async updateIntegrationStatus(
    @Args('input')
    input: UpdateIntegrationStatusInput
  ): Promise<boolean> {
    const integration = await this.integrationService.findOne(input.formId, input.appId)

    if (integration) {
      await this.integrationService.update(integration.id, {
        status: input.status
      })
    }

    return true
  }
}
