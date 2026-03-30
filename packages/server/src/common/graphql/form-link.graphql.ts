import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

@InputType()
export class FormLinksInput {
  @Field()
  formId: string
}

@InputType()
export class DeleteFormLinkInput {
  @Field()
  id: string

  @Field()
  formId: string
}

@InputType()
export class FormLinkStatsInput {
  @Field()
  id: string

  @Field()
  formId: string
}

@ObjectType()
export class FormLinkType {
  @Field()
  id: string

  @Field()
  shortLink: string

  @Field()
  target: string

  @Field()
  source: string

  @Field(type => Int, { defaultValue: 0 })
  visitCount: number

  @Field()
  createdAt: string
}

@ObjectType()
export class StatsNameValueType {
  @Field()
  name: string

  @Field(type => Int)
  value: number
}

@ObjectType()
export class StatsPeriodType {
  @Field(type => [StatsNameValueType])
  browser: StatsNameValueType[]

  @Field(type => [StatsNameValueType])
  os: StatsNameValueType[]

  @Field(type => [StatsNameValueType])
  country: StatsNameValueType[]

  @Field(type => [StatsNameValueType])
  referrer: StatsNameValueType[]

  @Field(type => [Int])
  views: number[]
}

@ObjectType()
export class FormLinkStatsType {
  @Field(type => Int)
  visitCount: number

  @Field(type => StatsPeriodType)
  lastDay: StatsPeriodType

  @Field(type => StatsPeriodType)
  lastWeek: StatsPeriodType

  @Field(type => StatsPeriodType)
  lastMonth: StatsPeriodType
}
