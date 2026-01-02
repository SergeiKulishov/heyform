import { BullModule } from '@nestjs/bull'

import { BullOptionsFactory } from '@config'

import { CsvShortenQueue } from './csv-shorten.queue'
import { FormReportQueue } from './form-report.queue'
import { IntegrationQueue } from './integration-queue'
import { MailQueue } from './mail.queue'
import { SubmissionNotificationQueue } from './submission-notification.queue'
import { TranslateFormQueue } from './translate-form.queue'

export const QueueProviders = {
  CsvShortenQueue,
  FormReportQueue,
  MailQueue,
  TranslateFormQueue,
  IntegrationQueue,
  SubmissionNotificationQueue
}

export const QueueModules = Object.keys(QueueProviders).map(queueName => {
  return BullModule.registerQueueAsync({
    name: queueName,
    useFactory: BullOptionsFactory
  })
})
