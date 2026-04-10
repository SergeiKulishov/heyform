import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

import { nanoid } from '@voxly/utils'

@Schema({
  timestamps: true
})
export class FolderModel extends Document {
  @Prop({ default: () => nanoid(8) })
  _id: string

  @Prop({ required: true, index: true })
  teamId: string

  @Prop({ required: true, index: true })
  projectId: string

  @Prop({ default: null })
  parentId: string | null

  @Prop({ required: true })
  name: string

  @Prop({ default: 0 })
  order: number
}

export const FolderSchema = SchemaFactory.createForClass(FolderModel)

FolderSchema.index({ projectId: 1, parentId: 1 })
FolderSchema.index({ teamId: 1 })
