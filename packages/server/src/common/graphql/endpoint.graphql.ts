import { HiddenFieldAnswer } from '@voxly/shared-types-enums'
import { IsNumber, IsOptional, IsString } from 'class-validator'

import { CdnTokenInput } from './user.graphql'
import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'

@InputType()
export class UploadFormFileInput extends CdnTokenInput {
  @Field()
  formId: string
}

@InputType()
export class UploadFormSignatureInput {
  @Field()
  formId: string

  @Field()
  signature: string
}

@InputType()
export class OpenFormInput {
  @Field()
  formId: string
}

@InputType()
export class VerifyPasswordInput {
  @Field()
  formId: string

  @Field()
  password: string
}

@InputType()
class HiddenFieldAnswerInput {
  @Field()
  id: string

  @Field()
  name: string

  @Field({ nullable: true })
  value?: string
}

@InputType()
export class CompleteSubmissionInput {
  @Field()
  formId: string

  @Field(type => GraphQLJSONObject)
  answers: Record<string, any>

  @Field(type => [HiddenFieldAnswerInput])
  hiddenFields: HiddenFieldAnswer[]

  @Field({ nullable: true })
  partialSubmission?: boolean

  @Field()
  openToken: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  passwordToken?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  recaptchaToken?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  lotNumber?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  captchaOutput?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  passToken?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  genTime?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  sessionId?: string

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  lastFieldId?: string

  @Field({ nullable: true })
  @IsNumber()
  @IsOptional()
  lastFieldIndex?: number
}

@ObjectType()
export class CompleteSubmissionType {
  @Field({ nullable: true })
  clientSecret?: string
}

@ObjectType()
export class InitGeetestCaptchaType {
  @Field()
  challenge: string

  @Field()
  gt: string

  @Field()
  new_captcha: boolean

  @Field()
  success: number
}

@ObjectType()
export class UploadFormFileType {
  @Field()
  filename: string

  @Field()
  url: string

  @Field()
  size: number
}
