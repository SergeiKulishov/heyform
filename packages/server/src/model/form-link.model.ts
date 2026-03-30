import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

import { nanoid } from '@voxly/utils'

@Schema({
  timestamps: true
})
export class FormLinkModel extends Document {
  @Prop({ default: () => nanoid(8) })
  _id: string

  @Prop({ required: true, index: true })
  formId: string

  @Prop({ required: true })
  teamId: string

  @Prop({ required: true })
  kuttId: string

  @Prop({ required: true })
  shortLink: string

  @Prop({ required: true })
  target: string

  @Prop({ type: String, enum: ['manual', 'csv'], default: 'manual' })
  source: string
}

export const FormLinkSchema = SchemaFactory.createForClass(FormLinkModel)
