import { BadRequestException } from '@nestjs/common'

import { Auth, User } from '@decorator'
import { UserModel } from '@model'
import { Query, Resolver } from '@nestjs/graphql'
import { AuthService, MailService } from '@service'

@Resolver()
@Auth()
export class EmailVerificationCodeResolver {
  constructor(
    private readonly mailService: MailService,
    private readonly authService: AuthService
  ) {}

  @Query(returns => Boolean)
  async emailVerificationCode(@User() user: UserModel): Promise<boolean> {
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified')
    }

    const key = `verify_email:${user.id}`
    const code = await this.authService.getVerificationCode(key)

    this.mailService.emailVerificationRequest(user.email, code, user.lang)

    return true
  }
}
