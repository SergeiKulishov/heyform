import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { JobOptions, Queue } from 'bull'
import { readFileSync, readdirSync } from 'fs'
import { basename, extname, join } from 'path'

import { EMAIL_TEMPLATES_DIR, SMTP_FROM } from '@environments'
import { helper } from '@voxly/utils'

const DEFAULT_LOCALE = 'en'
const SUPPORTED_LOCALES = ['en', 'ru']
const HTML_EXT = '.html'
const TEMPLATE_META_REGEX = /^---([\s\S]*?)---[\n\s\S]\n/

type TemplateData = { subject: string; html: string }

interface JoinWorkspaceAlertOptions {
  teamName: string
  userName: string
}

interface ProjectDeletionAlertOptions {
  projectName: string
  teamName: string
  userName: string
}

interface ProjectDeletionRequestOptions {
  projectName: string
  teamName: string
  code: string
}

interface SubmissionNotificationOptions {
  formName: string
  submission: string
  link: string
}

interface TeamDeletionAlertOptions {
  teamName: string
  userName: string
}

interface TeamDeletionRequestOptions {
  teamName: string
  code: string
}

interface TeamInvitationOptions {
  userName: string
  teamName: string
  link: string
}

interface UserSecurityAlertOptions {
  deviceModel: string
  ip: string
  loginAt: string
}

@Injectable()
export class MailService {
  private readonly emailTemplates: Record<string, Record<string, TemplateData>> = {}

  constructor(@InjectQueue('MailQueue') private readonly mailQueue: Queue) {
    this.init()
  }

  private getTemplate(locale: string, templateName: string): TemplateData | undefined {
    const lang = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
    return this.emailTemplates[lang]?.[templateName]
  }

  async accountDeletionAlert(to: string, locale: string = DEFAULT_LOCALE) {
    await this.addQueue('account_deletion_alert', to, locale)
  }

  async accountDeletionRequest(to: string, code: string, locale: string = DEFAULT_LOCALE) {
    await this.addQueue('account_deletion_request', to, locale, {
      code
    })
  }

  async emailVerificationRequest(to: string, code: string, locale: string = DEFAULT_LOCALE) {
    await this.addQueue('email_verification_request', to, locale, {
      code
    })
  }

  async formInvitation(to: string, link: string, locale: string = DEFAULT_LOCALE) {
    await this.addQueue('form_invitation', to, locale, {
      link
    })
  }

  async joinWorkspaceAlert(
    to: string,
    options: JoinWorkspaceAlertOptions,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('join_workspace_alert', to, locale, options)
  }

  async passwordChangeAlert(to: string, locale: string = DEFAULT_LOCALE) {
    await this.addQueue('password_change_alert', to, locale)
  }

  async projectDeletionAlert(
    to: string,
    options: ProjectDeletionAlertOptions,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('project_deletion_alert', to, locale, options)
  }

  async projectDeletionRequest(
    to: string,
    options: ProjectDeletionRequestOptions,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('project_deletion_request', to, locale, options)
  }

  async scheduleAccountDeletionAlert(
    to: string,
    fullName: string,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('schedule_account_deletion_alert', to, locale, {
      fullName,
      email: to
    })
  }

  async submissionNotification(
    to: string,
    options: SubmissionNotificationOptions,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('submission_notification', to, locale, options)
  }

  async teamDataExportReady(to: string, link: string, locale: string = DEFAULT_LOCALE) {
    await this.addQueue('team_data_export_ready', to, locale, {
      link
    })
  }

  async teamDeletionAlert(
    to: string,
    options: TeamDeletionAlertOptions,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('team_deletion_alert', to, locale, options)
  }

  async teamDeletionRequest(
    to: string,
    options: TeamDeletionRequestOptions,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('team_deletion_request', to, locale, options)
  }

  async teamInvitation(
    to: string,
    options: TeamInvitationOptions,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('team_invitation', to, locale, {
      ...options,
      email: to
    })
  }

  async userSecurityAlert(
    to: string,
    options: UserSecurityAlertOptions,
    locale: string = DEFAULT_LOCALE
  ) {
    await this.addQueue('user_security_alert', to, locale, options)
  }

  private init() {
    for (const locale of SUPPORTED_LOCALES) {
      const localeDir = join(EMAIL_TEMPLATES_DIR, locale)

      try {
        const allFiles = readdirSync(localeDir)
        const filePaths = allFiles
          .filter(file => extname(file) === HTML_EXT)
          .map(file => join(localeDir, file))

        this.emailTemplates[locale] = {}

        for (const filePath of filePaths) {
          const name = basename(filePath, HTML_EXT)
          const content = readFileSync(filePath).toString('utf8')
          const matches = content.match(TEMPLATE_META_REGEX)

          const html = content.replace(TEMPLATE_META_REGEX, '')

          if (matches) {
            const metaLines = matches[1].split('\n')
            const metaObject: Record<string, string> = {}

            metaLines.forEach(line => {
              const [key, value] = line.split(':')

              if (helper.isValid(key) && helper.isValid(value)) {
                metaObject[key.trim()] = value.trim()
              }
            })

            this.emailTemplates[locale][name] = {
              subject: metaObject.title,
              html
            }
          }
        }
      } catch {
        this.emailTemplates[locale] = {}
      }
    }
  }

  private async addQueue(
    templateName: string,
    to: string,
    locale: string,
    replacements?: Record<string, any>,
    options?: JobOptions
  ) {
    const result = this.getTemplate(locale, templateName)

    if (helper.isEmpty(result)) {
      return
    }

    let subject = result!.subject
    let html = result!.html

    if (helper.isValid(replacements) && helper.isPlainObject(replacements)) {
      Object.keys(replacements!).forEach(key => {
        const value = replacements![key]
        const regex = new RegExp(`{${key}}`, 'g')

        subject = subject.replace(regex, value)
        html = html?.replace(regex, value)
      })
    }

    await this.mailQueue.add(
      {
        queueName: 'MailQueue',
        data: {
          from: SMTP_FROM,
          to,
          subject,
          html
        }
      },
      options
    )
  }
}
