import { Controller, Get, Header, Res } from '@nestjs/common'
import { Response } from 'express'

import {
  APP_HOMEPAGE_URL,
  COOKIE_DOMAIN,
  GEETEST_CAPTCHA_KEY,
  GOOGLE_RECAPTCHA_KEY,
  STRIPE_PUBLISHABLE_KEY
} from '@environments'

@Controller()
export class DashboardController {
  @Get([
    '/',
    '/dashboard',
    '/dashboard/*',
    '/workspace/*',
    '/project/*',
    '/auth/*',
    '/sign-up',
    '/login',
    '/logout',
    '/verify-email',
    '/reset-password',
    '/forgot-password',
    '/oauth/*'
  ])
  @Header('X-Frame-Options', 'SAMEORIGIN')
  index(@Res() res: Response) {
    return res.render('index', {
      title: 'HeyForm Dashboard - Create and Manage Custom Forms Effortlessly',
      description:
        "Simplify your form creation process with HeyForm's intuitive dashboard. Design, customize, and manage forms all in one place, with no coding required.",
      heyform: {
        homepageURL: APP_HOMEPAGE_URL,
        websiteURL: APP_HOMEPAGE_URL,
        cookieDomain: COOKIE_DOMAIN,
        stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
        geetestCaptchaId: GEETEST_CAPTCHA_KEY,
        googleRecaptchaKey: GOOGLE_RECAPTCHA_KEY
      }
    })
  }
}
