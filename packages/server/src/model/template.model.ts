import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import {
  FormField,
  FormKindEnum,
  HiddenField,
  InteractiveModeEnum,
  ThemeSettings
} from '@voxly/shared-types-enums'
import { Logic, Variable } from '@voxly/shared-types-enums'
import { Document } from 'mongoose'

@Schema({
  timestamps: true
})
export class TemplateModel extends Document {
  @Prop({ required: true })
  name: string

  @Prop({ required: false, index: true })
  teamId?: string

  @Prop({ required: false })
  memberId?: string

  @Prop()
  recordId?: string

  @Prop()
  slug?: string

  @Prop()
  thumbnail?: string

  @Prop({ required: true })
  category: string

  @Prop()
  description?: string

  @Prop({
    type: Number,
    required: true,
    enum: Object.values(InteractiveModeEnum),
    default: InteractiveModeEnum.GENERAL
  })
  interactiveMode: InteractiveModeEnum

  @Prop({
    type: Number,
    required: true,
    enum: Object.values(FormKindEnum),
    default: FormKindEnum.SURVEY
  })
  kind: FormKindEnum

  @Prop({ default: [] })
  fields?: FormField[]

  @Prop({ default: [] })
  hiddenFields?: HiddenField[]

  @Prop({ default: [] })
  logics?: Logic[]

  @Prop({ default: [] })
  variables?: Variable[]

  @Prop()
  fieldsUpdatedAt?: number

  @Prop()
  themeSettings?: ThemeSettings

  @Prop({ required: false, default: 0 })
  usedCount?: number

  @Prop({ required: false, default: 0 })
  timeSaving?: string

  @Prop({ required: false, default: 0 })
  timeToComplete?: string

  @Prop({ default: false })
  published?: boolean
}

export const TemplateSchema = SchemaFactory.createForClass(TemplateModel)
