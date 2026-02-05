import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { FormTheme } from '@voxly/shared-types-enums'
import { Document } from 'mongoose'

import { nanoid } from '@voxly/utils'

@Schema()
export class BrandKitModel extends Document {
  @Prop({ default: () => nanoid(8) })
  _id: string

  @Prop({ required: true, index: true })
  teamId: string

  @Prop()
  logo: string

  @Prop()
  theme: FormTheme
}

export const BrandKitSchema = SchemaFactory.createForClass(BrandKitModel)
