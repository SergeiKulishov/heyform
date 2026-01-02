import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export enum CsvShortenJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

@Schema({
  timestamps: true
})
export class CsvShortenJobModel extends Document {
  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true })
  formId: string

  @Prop({
    type: String,
    enum: Object.values(CsvShortenJobStatus),
    default: CsvShortenJobStatus.PENDING,
    index: true
  })
  status: CsvShortenJobStatus

  @Prop({ required: true })
  fileName: string

  @Prop()
  filePath?: string

  @Prop()
  resultFileName?: string

  @Prop({ default: false })
  useUrlShortener: boolean

  @Prop({ default: 0 })
  totalRows: number

  @Prop({ default: 0 })
  processedRows: number

  @Prop({ default: 0 })
  failedRows: number

  @Prop()
  errorMessage?: string

  @Prop()
  completedAt?: Date

  @Prop({ required: true, index: true })
  expiresAt: Date
}

export const CsvShortenJobSchema = SchemaFactory.createForClass(CsvShortenJobModel)

// Автоматическое удаление через 24 часа
CsvShortenJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
