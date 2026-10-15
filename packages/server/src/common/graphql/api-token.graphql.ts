import { IsEnum, Length } from 'class-validator'

import { Field, InputType, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class ApiTokenType {
  @Field()
  id: string

  @Field()
  name: string

  @Field()
  prefix: string

  @Field()
  scope: string

  @Field({ nullable: true })
  lastUsedAt?: Date

  @Field()
  createdAt: Date
}

@ObjectType()
export class CreateApiTokenType extends ApiTokenType {
  @Field()
  token: string
}

@InputType()
export class CreateApiTokenInput {
  @Field()
  teamId: string

  @Field()
  @Length(1, 50)
  name: string

  @Field()
  @IsEnum(['read', 'read_write'])
  scope: string
}

@InputType()
export class RevokeApiTokenInput {
  @Field()
  teamId: string

  @Field()
  tokenId: string
}

@InputType()
export class ApiTokenListInput {
  @Field()
  teamId: string
}
