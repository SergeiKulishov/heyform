import { HiddenFieldAnswer } from '@voxly/shared-types-enums'

import { axios } from '../utils/axios'

const INIT_GEETEST_CAPTCHA_GQL = `query initGeetestCaptcha($input: FormDetailInput!) {
  initGeetestCaptcha(input: $input) {
    challenge
    gt
    new_captcha
    success
  }
}`

const OPEN_FORM_GQL = `query openForm($input: OpenFormInput!) {
  openForm(input: $input)
}`

const VERIFY_FORM_PASSWORD_GQL = `query verifyFormPassword($input: VerifyPasswordInput!) {
  verifyFormPassword(input: $input)
}`

const UPLOAD_FILE_TOKEN_GQL = `mutation uploadFileToken($input: UploadFormFileInput!) {
  uploadFileToken(input: $input) {
    token
    urlPrefix
    key
  }
}`

const COMPLETE_SUBMISSION_GQL = `mutation completeSubmission($input: CompleteSubmissionInput!) {
	completeSubmission(input: $input) {
	  clientSecret
	}
}`

export class EndpointService {
  static async initGeetestCaptcha(formId: string): Promise<Record<string, Any>> {
    const result = await axios({
      query: INIT_GEETEST_CAPTCHA_GQL,
      variables: {
        input: {
          formId
        }
      }
    })
    return result.initGeetestCaptcha
  }

  static async openForm(formId: string): Promise<string> {
    const result = await axios({
      query: OPEN_FORM_GQL,
      variables: {
        input: {
          formId
        }
      }
    })
    return result.openForm
  }

  static async verifyFormPassword(formId: string, password: string): Promise<string> {
    const result = await axios({
      query: VERIFY_FORM_PASSWORD_GQL,
      variables: {
        input: {
          formId,
          password
        }
      }
    })
    return result.verifyFormPassword
  }

  static async uploadFileToken(
    formId: string,
    filename: string,
    mime: string
  ): Promise<{
    token: string
    urlPrefix: string
    key: string
  }> {
    const result = await axios({
      query: UPLOAD_FILE_TOKEN_GQL,
      variables: {
        input: {
          formId,
          filename,
          mime
        }
      }
    })
    return result.uploadFileToken
  }

  static async completeSubmission(input: {
    formId: string
    contactId?: string
    openToken: string
    passwordToken?: string
    answers: Record<string, Any>
    hiddenFields: HiddenFieldAnswer[]
    // Google reCAPTCHA token
    recaptchaToken?: string
    // GeeTest Captcha token
    geetestChallenge?: string
    geetestValidate?: string
    geetestSeccode?: string
    partialSubmission?: boolean
    // Partial submission tracking
    sessionId?: string
    lastFieldId?: string
    lastFieldIndex?: number
  }): Promise<{ clientSecret?: string }> {
    const result = await axios({
      query: COMPLETE_SUBMISSION_GQL,
      variables: {
        input
      }
    })
    return result.completeSubmission
  }
}
