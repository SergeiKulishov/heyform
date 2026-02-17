import { Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

const logger = new Logger('SmtpService')

export interface SmtpOptions {
  host: string
  port: number
  user: string
  password: string
  secure: boolean
  servername: string
  ignoreCert: boolean
  pool: boolean
  logger: any
}

export interface SmtpMessage {
  from: string
  to: string
  subject: string
  html: string
}

export async function smtpSendMail(
  options: SmtpOptions,
  message: SmtpMessage
): Promise<string | unknown> {
  // TODO: удалить перед продакшеном
  logger.debug(`smtpSendMail options: ${JSON.stringify(options)}`)
  logger.debug(`smtpSendMail message: ${JSON.stringify(message)}`)

  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.user,
      pass: options.password
    },
    tls: {
      servername: options.servername,
      rejectUnauthorized: options.ignoreCert
    },
    pool: options.pool,
    logger: options.logger
  } as any)

  const result = await transport.sendMail(message)
  return result.messageId
}
