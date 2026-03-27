import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

import { BrandKitModel } from './brand-kit.model'
import { ProjectModel } from './project.model'
import { INVITE_CODE_EXPIRE_DAYS } from '@environments'
import { date, nanoid } from '@voxly/utils'

@Schema({
  timestamps: true
})
export class TeamModel extends Document {
  @Prop({ default: () => nanoid(8) })
  _id: string

  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  ownerId: string

  @Prop()
  avatar?: string

  @Prop()
  removeBranding?: boolean

  @Prop()
  customSharingURL?: string

  @Prop({ default: () => nanoid(), unique: true })
  inviteCode: string

  // team invite code expire at unix timestamp
  @Prop({
    default: () => {
      return date().add(INVITE_CODE_EXPIRE_DAYS, 'day').unix()
    }
  })
  inviteCodeExpireAt: number

  @Prop({ default: true })
  allowJoinByInviteLink: boolean

  @Prop()
  inviteLinkResetAt?: number

  @Prop()
  storageQuota?: number

  @Prop({ type: Object })
  permissionMatrix?: Record<string, number[]>

  @Prop({ type: Number })
  defaultMemberRole?: number

  /**
   * Attach references to the team model for easy query,
   * will not be used as a column in the team schema
   */
  // Projects
  projects?: ProjectModel[]

  // Member count
  memberCount?: number

  // Team brand kits
  brandKits?: BrandKitModel[]

  // If the user is team owner
  isOwner?: boolean

  // The role of the current user in this team
  role?: number
}

export const TeamSchema = SchemaFactory.createForClass(TeamModel)
