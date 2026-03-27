import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsUrl,
  Length,
  ValidateIf
} from 'class-validator'

import { FormType, ProjectType } from '@graphql'
import { FormModel, ProjectModel, TeamRoleEnum } from '@model'
import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'

@InputType()
export class CreateTeamInput {
  @Field()
  @Length(1, 30, {
    message: 'Workspace name is limited to 30 characters'
  })
  name: string

  @Field({ nullable: true })
  @IsOptional()
  avatar?: string

  @Field(type => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  members?: string[]

  @Field()
  projectName: string

  @Field(type => Number, { nullable: true })
  @IsOptional()
  defaultMemberRole?: TeamRoleEnum
}

@InputType()
export class TeamDetailInput {
  @Field()
  teamId: string
}

@InputType()
export class SearchTeamInput extends TeamDetailInput {
  @Field()
  query: string
}

@InputType()
export class DissolveTeamInput extends TeamDetailInput {
  @Field()
  code: string
}

@InputType()
export class PublicTeamDetailInput extends TeamDetailInput {
  @Field()
  inviteCode: string
}

@InputType()
export class InviteMemberInput extends TeamDetailInput {
  @Field(type => [String])
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  emails: string[]
}

@InputType()
export class TeamCdnTokenInput {
  @Field()
  teamId: string

  @Field()
  mime: string

  @Field()
  filename: string
}

@InputType()
export class CreateBrandKitInput extends TeamDetailInput {
  @Field()
  @IsUrl()
  logo: string

  @Field(type => GraphQLJSONObject)
  @IsObject()
  theme: Record<string, any>
}

@InputType()
export class UpdateBrandKitInput extends TeamDetailInput {
  @Field({ nullable: true })
  @IsUrl()
  @IsOptional()
  logo: string

  @Field(type => GraphQLJSONObject, { nullable: true })
  @IsObject()
  @IsOptional()
  theme: Record<string, any>
}

@InputType()
export class UpdateTeamInput extends TeamDetailInput {
  @Field({ nullable: true })
  @Length(1, 30, {
    message: 'Workspace name is limited to 30 characters'
  })
  @IsOptional()
  name?: string

  @Field({ nullable: true })
  @IsUrl()
  @IsOptional()
  avatar?: string

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  removeBranding?: boolean

  @Field({ nullable: true })
  @ValidateIf(
    o =>
      o.customSharingURL !== null && o.customSharingURL !== undefined && o.customSharingURL !== ''
  )
  @IsUrl()
  @IsOptional()
  customSharingURL?: string

  @Field(type => Number, { nullable: true })
  @IsOptional()
  defaultMemberRole?: TeamRoleEnum
}

@InputType()
export class CreateInvitationInput extends TeamDetailInput {
  @Field(type => [String])
  emails: string[]
}

@InputType()
export class JoinTeamInput extends TeamDetailInput {
  @Field()
  inviteCode: string
}

@InputType()
export class DealWithInvitationInput {
  @Field()
  invitationId: string

  @Field()
  accept: boolean
}

@InputType()
export class TransferTeamInput extends TeamDetailInput {
  @Field()
  memberId: string
}

@InputType()
export class UpdateTeamMemberInput extends TransferTeamInput {
  @Field(type => Number)
  @IsEnum([TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR, TeamRoleEnum.MEMBER])
  role: TeamRoleEnum
}

@InputType()
export class UpdatePermissionMatrixInput extends TeamDetailInput {
  @Field(type => GraphQLJSONObject)
  @IsObject()
  permissionMatrix: Record<string, number[]>
}

@ObjectType()
export class TeamIconType {
  @Field({ nullable: true })
  name?: string

  @Field()
  color: string

  @Field()
  background: string
}

@ObjectType()
export class PublicTeamOwnerType {
  @Field()
  name: string

  @Field({ nullable: true })
  avatar?: string
}

@ObjectType()
export class PublicTeamType {
  @Field()
  id: string

  @Field()
  name: string

  @Field({ nullable: true })
  avatar?: string

  @Field()
  allowJoinByInviteLink: boolean

  @Field({ nullable: true })
  memberCount?: number

  @Field({ nullable: true })
  additionalSeats?: number

  @Field(type => PublicTeamOwnerType, { nullable: true })
  owner?: PublicTeamOwnerType
}

@ObjectType()
class BrandKitType {
  @Field()
  id: string

  @Field()
  logo: string

  @Field(type => GraphQLJSONObject)
  theme: Record<string, any>
}

@ObjectType()
export class TeamType extends PublicTeamType {
  @Field()
  ownerId: string

  @Field()
  inviteCode: string

  @Field({ nullable: true })
  inviteCodeExpireAt?: number

  @Field({ nullable: true })
  storageQuota?: number

  @Field({ nullable: true })
  submissionQuota?: number

  @Field({ nullable: true })
  isOwner?: boolean

  @Field(type => [ProjectType], { nullable: true })
  projects?: ProjectModel[]

  @Field(type => [BrandKitType], { nullable: true })
  brandKits: BrandKitType[]

  @Field(type => Number, { nullable: true })
  role?: TeamRoleEnum

  @Field({ nullable: true })
  removeBranding?: boolean

  @Field({ nullable: true })
  customSharingURL?: string

  @Field()
  createdAt: Date

  @Field(type => GraphQLJSONObject, { nullable: true })
  permissionMatrix?: Record<string, number[]>

  @Field(type => Number, { nullable: true })
  defaultMemberRole?: TeamRoleEnum
}

@ObjectType()
export class TeamOverviewType {
  @Field({ nullable: true })
  memberCount?: number

  @Field({ nullable: true })
  formCount?: number

  @Field({ nullable: true })
  submissionQuota?: number

  @Field({ nullable: true })
  storageQuota?: number
}

@ObjectType()
export class TeamMemberType {
  @Field()
  id: string

  @Field()
  name: string

  @Field()
  email: string

  @Field()
  avatar: string

  @Field()
  role: TeamRoleEnum

  @Field({ nullable: true })
  lastSeenAt?: number

  @Field()
  isOwner?: boolean
}

@ObjectType()
class DocType {
  @Field()
  id: string

  @Field()
  title: string

  @Field()
  description: string
}

@ObjectType()
export class SearchTeamType {
  @Field(type => [FormType], { nullable: true })
  forms: FormModel[]

  @Field(type => [DocType], { nullable: true })
  docs: DocType[]
}

@ObjectType()
export class TeamPermissionsType {
  @Field(type => GraphQLJSONObject)
  permissions: Record<string, boolean>
}
