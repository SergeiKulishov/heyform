import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

import { nanoid } from '@voxly/utils'

@Schema({
  timestamps: true
})
export class AppCodeModel extends Document {
  @Prop({ default: () => nanoid(20) })
  _id: string

  @Prop({
    type: String,
    required: true
  })
  appId: string

  @Prop({
    type: String,
    required: true
  })
  userId: string

  @Prop({
    type: String,
    required: true
  })
  redirectUri: string

  @Prop({
    type: Number
  })
  expireAt: number
}

export const AppCodeSchema = SchemaFactory.createForClass(AppCodeModel)
