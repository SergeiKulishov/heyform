import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({
  timestamps: true
})
export class ApiTokenModel extends Document {
  @Prop({
    type: String,
    required: true,
    index: true
  })
  teamId: string

  @Prop({
    type: String,
    required: true
  })
  userId: string

  @Prop({
    type: String,
    required: true
  })
  name: string

  @Prop({
    type: String,
    required: true,
    enum: ['read', 'read_write'],
    default: 'read'
  })
  scope: string

  @Prop({
    type: String,
    required: true,
    unique: true
  })
  tokenHash: string

  @Prop({
    type: String,
    required: true
  })
  prefix: string

  @Prop({
    type: Date
  })
  lastUsedAt?: Date

  @Prop({
    type: Date
  })
  revokedAt?: Date
}

export const ApiTokenSchema = SchemaFactory.createForClass(ApiTokenModel)
