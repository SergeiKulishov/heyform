import {
  FormRenderer,
  getTheme,
  getThemeStyle,
  getWebFontURL,
  sendMessageToParent
} from '@heyform-inc/form-renderer/src'
import {
  CaptchaKindEnum,
  FieldKindEnum,
  FormModel,
  HiddenFieldAnswer
} from '@heyform-inc/shared-types-enums'
import { FC, useEffect, useRef, useState } from 'react'

import { EndpointService } from '../service/endpoint'
import { geeTestToken, initGeeTest, recaptchaToken } from '../utils/captcha'
import { isStripeEnabled } from '../utils/payment'
import { Uploader } from '../utils/uploader'
import { helper } from '@heyform-inc/utils'

import { PasswordCheck } from './PasswordCheck'

interface RendererProps {
  form: FormModel
  query: Record<string, Any>
  locale: string
  contactId?: string
}

let captchaRef: Any = null

export const Renderer: FC<RendererProps> = ({ form, query, locale, contactId }) => {
  const openTokenRef = useRef<string>('')
  const passwordTokenRef = useRef<string>('')
  const [isPasswordChecked, setIsPasswordChecked] = useState(false)

  async function openForm() {
    sendMessageToParent('FORM_OPENED')
    openTokenRef.current = await EndpointService.openForm(form.id)
  }

  function handlePasswordFinish(passwordToken: string) {
    passwordTokenRef.current = passwordToken
    setIsPasswordChecked(true)
  }

  async function handleSubmit(
    values: Any,
    partialSubmission?: boolean,
    stripe?: Any,
    meta?: { sessionId: string; lastFieldId?: string; lastFieldIndex?: number }
  ) {
    try {
      let token: Record<string, Any> = {}

      switch (form.settings?.captchaKind) {
        case CaptchaKindEnum.GOOGLE_RECAPTCHA:
          token.recaptchaToken = await recaptchaToken(captchaRef)
          break

        case CaptchaKindEnum.GEETEST_CAPTCHA:
          captchaRef?.showCaptcha()
          token = await geeTestToken(captchaRef)
          break
      }

      const file = await new Uploader(form, values).start()

      const hiddenFields = (form!.hiddenFields || [])
        .map(field => {
          const value = query[field.name]

          if (helper.isValid(value)) {
            return {
              ...field,
              value
            }
          }
        })
        .filter(Boolean) as HiddenFieldAnswer[]

      const { clientSecret } = await EndpointService.completeSubmission({
        formId: form.id,
        contactId,
        answers: {
          ...values,
          ...file
        },
        hiddenFields,
        openToken: openTokenRef.current,
        passwordToken: passwordTokenRef.current,
        partialSubmission,
        sessionId: meta?.sessionId,
        lastFieldId: meta?.lastFieldId,
        lastFieldIndex: meta?.lastFieldIndex,
        ...(token || {})
      })

      if (stripe && helper.isValid(clientSecret)) {
        const paymentField = form.fields?.find(f => f.kind === FieldKindEnum.PAYMENT)

        if (paymentField) {
          const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: stripe.elements.getElement('cardNumber'),
              billing_details: values[paymentField.id]?.billingDetails
            }
          })

          if (result.error) {
            throw new Error(result.error.message)
          }
        }
      }

      sendMessageToParent('FORM_SUBMITTED')
    } catch (err: Any) {
      // Reset GeeTest captcha
      captchaRef?.reset()

      /**
       * Throw error to let Renderer knows that there was an error.
       * If we don't do this, the form will be show as submitted
       */
      throw err
    }
  }

  async function initCaptcha() {
    switch (form.settings?.captchaKind) {
      case CaptchaKindEnum.GEETEST_CAPTCHA:
        captchaRef = await initGeeTest()
        break

      case CaptchaKindEnum.GOOGLE_RECAPTCHA:
        captchaRef = window.grecaptcha
        break
    }
  }

  useEffect(() => {
    sendMessageToParent('FORM_LOADED')

    if (!form.suspended && form.settings?.active) {
      openForm()
      initCaptcha()
    }
  }, [])

  if (form.settings?.requirePassword && !isPasswordChecked) {
    return <PasswordCheck form={form} onFinish={handlePasswordFinish} />
  }

  const theme = getTheme(form.themeSettings?.theme)
  const fontURL = getWebFontURL(theme.fontFamily)

  return (
    <>
      <link href={fontURL} rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: getThemeStyle(theme, query) }} />

      {form.settings?.captchaKind === CaptchaKindEnum.GOOGLE_RECAPTCHA && (
        <script
          src={`https://www.google.com/recaptcha/api.js?render=${window.heyform.googleRecaptchaKey}`}
        />
      )}

      {form.settings?.captchaKind === CaptchaKindEnum.GEETEST_CAPTCHA && (
        <script src="https://static.geetest.com/v4/gt4.js" />
      )}

      {isStripeEnabled(form) && <script id="stripe" src="https://js.stripe.com/v3/" />}

      <FormRenderer
        form={form as Any}
        query={query}
        locale={locale}
        stripeApiKey={(form as Any).stripe?.publishableKey}
        stripeAccountId={(form as Any).stripe?.accountId}
        autoSave={!(form.settings?.enableTimeLimit && helper.isValid(form.settings?.timeLimit))}
        alwaysShowNextButton={true}
        customUrlRedirects={(form.settings as Any)?.customUrlRedirects}
        enableQuestionList={form.settings?.enableQuestionList}
        enableNavigationArrows={form.settings?.enableNavigationArrows}
        onSubmit={handleSubmit}
      />

      {/* Custom css */}
      {helper.isValid(form.themeSettings?.theme?.customCSS) && (
        <style dangerouslySetInnerHTML={{ __html: form.themeSettings!.theme!.customCSS! }} />
      )}
    </>
  )
}
