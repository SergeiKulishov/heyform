import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SocialLoginTypeEnum } from '@voxly/shared-types-enums'
import { Document } from 'mongoose'

@Schema({
  timestamps: true
})
export class UserSocialAccountModel extends Document {
  @Prop({
    type: String,
    required: true
  })
  kind: SocialLoginTypeEnum

  @Prop({ required: true })
  userId: string

  @Prop({ required: true })
  openId: string
}

export const UserSocialAccountSchema = SchemaFactory.createForClass(UserSocialAccountModel)

UserSocialAccountSchema.index({ kind: 1, openId: 1 }, { unique: true })
UserSocialAccountSchema.index({ kind: 1, userId: 1 }, { unique: true })
