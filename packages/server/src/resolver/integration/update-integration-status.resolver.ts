import { PermissionKey } from '@common/permission'

import { Auth, FormGuard, RequirePermission } from '@decorator'
import { UpdateIntegrationStatusInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { IntegrationService } from '@service'

@Resolver()
@Auth()
export class UpdateIntegrationStatusResolver {
  constructor(private readonly integrationService: IntegrationService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @RequirePermission(PermissionKey.INTEGRATION_MANAGE)
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
