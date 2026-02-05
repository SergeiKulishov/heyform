import { BadRequestException } from '@nestjs/common'

import { Auth, FormGuard } from '@decorator'
import { UpdateIntegrationInput } from '@graphql'
import { IntegrationStatusEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { AppService, IntegrationService } from '@service'
import { helper } from '@voxly/utils'

@Resolver()
@Auth()
export class UpdateIntegrationSettingsResolver {
  constructor(
    private readonly appService: AppService,
    private readonly integrationService: IntegrationService
  ) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  async updateIntegrationSettings(
    @Args('input')
    input: UpdateIntegrationInput
  ): Promise<boolean> {
    const app = this.appService.findById(input.appId)

    if (helper.isEmpty(input.config)) {
      throw new BadRequestException('Invalid attributes arguments')
    }

    await this.integrationService.createOrUpdate(input.formId, app.id, {
      config: input.config,
      status: IntegrationStatusEnum.ACTIVE
    })

    return true
  }
}
