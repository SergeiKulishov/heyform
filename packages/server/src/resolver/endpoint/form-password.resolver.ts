import { BadRequestException, Headers, UseGuards } from '@nestjs/common'

import { FORM_ENCRYPTION_KEY } from '@environments'
import { VerifyPasswordInput } from '@graphql'
import { EndpointAnonymousIdGuard } from '@guard'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormService } from '@service'
import { aesEncryptObject } from '@utils'
import { timestamp } from '@voxly/utils'

@Resolver()
@UseGuards(EndpointAnonymousIdGuard)
export class FormPasswordResolver {
  constructor(private readonly formService: FormService) {}

  @Query(returns => String)
  async verifyFormPassword(
    @Headers('x-anonymous-id') anonymousId: string,
    @Args('input') input: VerifyPasswordInput
  ): Promise<string> {
    const form = await this.formService.findByIdCached(input.formId)

    if (!form) {
      throw new BadRequestException('The form does not exist')
    }

    if (form.suspended) {
      throw new BadRequestException('The form is suspended')
    }

    if (form.settings.active !== true) {
      throw new BadRequestException('The form does not active')
    }

    if (!form.settings.requirePassword || input.password !== form.settings.password) {
      throw new BadRequestException('The password does not match')
    }

    return aesEncryptObject(
      {
        timestamp: timestamp(),
        anonymousId,
        password: input.password
      },
      FORM_ENCRYPTION_KEY
    )
  }
}
