import { BadRequestException, UseGuards } from '@nestjs/common'

import { GraphqlRequest, GraphqlResponse } from '@decorator'
import { LoginInput } from '@graphql'
import { DeviceIdGuard } from '@guard'
import { UserActivityKindEnum } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { AuthService, MailService, UserService } from '@service'
import { ClientInfo, GqlClient, comparePassword } from '@utils'
import { date, helper } from '@voxly/utils'

@Resolver()
@UseGuards(DeviceIdGuard)
export class LoginResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly mailService: MailService
  ) {}

  @Query(returns => Boolean)
  async login(
    @GqlClient() client: ClientInfo,
    @GraphqlRequest() req: any,
    @GraphqlResponse() res: any,
    @Args('input') input: LoginInput
  ): Promise<boolean> {
    const user = await this.userService.findByEmail(input.email)

    if (helper.isEmpty(user)) {
      throw new BadRequestException('The password does not match')
    }

    const key = `limit:login:${user.id}`

    await this.authService.attemptsCheck(key, async () => {
      if (helper.isEmpty(user.password)) {
        throw new BadRequestException('The password does not match')
      }

      const verified = await comparePassword(input.password, user.password)

      if (!verified) {
        throw new BadRequestException('The password does not match')
      }
    })

    const devices = await this.authService.devices(user.id)

    if (helper.isValid(devices) && !devices.includes(client.deviceId)) {
      this.mailService.userSecurityAlert(
        user.email,
        {
          deviceModel: `${client.userAgent.browser.name} on ${client.userAgent.os.name}`,
          ip: client.ip,
          loginAt: date().format('YYYY-MM-DD HH:mm:ss')
        },
        user.lang
      )
    }

    this.authService.createUserActivity({
      kind: UserActivityKindEnum.LOGIN,
      userId: user.id,
      ...client
    })

    await this.authService.login({
      res,
      userId: user.id,
      deviceId: client.deviceId
    })

    return true
  }
}
