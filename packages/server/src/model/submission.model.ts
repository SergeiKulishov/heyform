import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import {
  Answer,
  HiddenFieldAnswer,
  SubmissionCategoryEnum,
  SubmissionStatusEnum,
  Variable
} from '@voxly/shared-types-enums'
import { Document } from 'mongoose'

import { UserAgent } from '@utils'

export enum ExportSubmissionFormatEnum {
  CSV = 'csv',
  PDF = 'pdf'
}

@Schema({
  timestamps: true
})
export class SubmissionModel extends Document {
  @Prop({ required: true, index: true })
  formId: string

  @Prop({
    type: String,
    required: true,
    enum: Object.values(SubmissionCategoryEnum),
    default: SubmissionCategoryEnum.INBOX
  })
  category: SubmissionCategoryEnum

  @Prop({ required: true })
  title: string

  @Prop()
  answers: Answer[]

  @Prop({ default: [] })
  hiddenFields?: HiddenFieldAnswer[]

  @Prop({ default: [] })
  variables?: Variable[]

  @Prop()
  startAt?: number

  @Prop()
  endAt?: number

  @Prop()
  ip: string

  @Prop()
  userAgent: UserAgent

  @Prop({
    type: Number,
    required: true,
    enum: Object.values(SubmissionStatusEnum),
    default: SubmissionStatusEnum.PUBLIC
  })
  status: SubmissionStatusEnum

  @Prop({ index: true })
  sessionId?: string

  @Prop()
  lastFieldId?: string

  @Prop()
  lastFieldIndex?: number

  @Prop({ default: true })
  isCompleted: boolean
}

export const SubmissionSchema = SchemaFactory.createForClass(SubmissionModel)
