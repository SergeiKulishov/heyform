import { Controller, Get, Res } from '@nestjs/common'
import { Response } from 'express'

import {
  APP_HOMEPAGE_URL,
  COOKIE_DOMAIN,
  DISABLE_LOGIN_WITH_APPLE,
  DISABLE_LOGIN_WITH_GOOGLE,
  GEETEST_CAPTCHA_KEY,
  GOOGLE_RECAPTCHA_KEY,
  STRIPE_PUBLISHABLE_KEY
} from '@environments'

@Controller()
export class FormController {
  @Get('/form/:formId')
  async index(@Res() res: Response) {
    return res.render('index', {
      heyform: {
        homepageURL: APP_HOMEPAGE_URL,
        websiteURL: APP_HOMEPAGE_URL,
        cookieDomain: COOKIE_DOMAIN,
        stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
        geetestCaptchaId: GEETEST_CAPTCHA_KEY,
        googleRecaptchaKey: GOOGLE_RECAPTCHA_KEY,
        disableLoginWithGoogle: DISABLE_LOGIN_WITH_GOOGLE,
        disableLoginWithApple: DISABLE_LOGIN_WITH_APPLE
      }
    })
  }
}
