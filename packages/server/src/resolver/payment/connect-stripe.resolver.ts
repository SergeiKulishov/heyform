import { BadRequestException } from '@nestjs/common'

import { Auth, FormGuard } from '@decorator'
import { ConnectStripeInput, ConnectStripeType } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, PaymentService, RedisService } from '@service'
import { helper } from '@voxly/utils'

@Resolver()
@Auth()
export class ConnectStripeResolver {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly formService: FormService,
    private readonly redisService: RedisService
  ) {}

  @Mutation(returns => ConnectStripeType)
  @FormGuard()
  async connectStripe(@Args('input') input: ConnectStripeInput): Promise<ConnectStripeType> {
    const key = `connect:stripe:${input.state}`
    const stateCache = await this.redisService.get(key)

    if (helper.isEmpty(stateCache)) {
      throw new BadRequestException('Authorization state expired')
    }

    if (stateCache !== input.formId) {
      throw new BadRequestException('Invalid authorization state')
    }

    const stripeAccount = await this.paymentService.getConnectAccount(input.code)

    await this.formService.update(input.formId, {
      stripeAccount
    })

    await this.redisService.del(key)

    return stripeAccount
  }
}
