import { Auth, FormGuard, Roles, User } from '@decorator'
import { FormDetailInput } from '@graphql'
import { TeamRoleEnum, UserModel } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { PaymentService, RedisService } from '@service'
import { nanoid } from '@voxly/utils'

@Resolver()
@Auth()
export class StripeAuthorizeUrlResolver {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly redisService: RedisService
  ) {}

  @Query(returns => String)
  @FormGuard()
  @Roles(TeamRoleEnum.OWNER)
  async stripeAuthorizeUrl(
    @User() user: UserModel,
    @Args('input') input: FormDetailInput
  ): Promise<string> {
    const state = nanoid()
    const key = `connect:stripe:${state}`

    await this.redisService.set({
      key,
      value: input.formId,
      duration: '1h'
    })

    return this.paymentService.getAuthorizeUrl(state, user.email)
  }
}
