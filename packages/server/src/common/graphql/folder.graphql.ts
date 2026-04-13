import { IsOptional } from 'class-validator'

import { Field, InputType, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class FolderType {
  @Field()
  id: string

  @Field()
  teamId: string

  @Field()
  projectId: string

  @Field({ nullable: true })
  parentId?: string | null

  @Field()
  name: string

  @Field({ nullable: true })
  color?: string

  @Field({ nullable: true })
  icon?: string

  @Field()
  order: number
}

@InputType()
export class FoldersInput {
  @Field()
  projectId: string
}

@InputType()
export class CreateFolderInput {
  @Field()
  projectId: string

  @Field({ nullable: true })
  @IsOptional()
  parentId?: string

  @Field()
  name: string

  @Field({ nullable: true })
  @IsOptional()
  color?: string

  @Field({ nullable: true })
  @IsOptional()
  icon?: string
}

@InputType()
export class UpdateFolderInput {
  @Field()
  projectId: string

  @Field()
  folderId: string

  @Field({ nullable: true })
  @IsOptional()
  name?: string

  @Field({ nullable: true })
  @IsOptional()
  color?: string

  @Field({ nullable: true })
  @IsOptional()
  icon?: string
}

@InputType()
export class DeleteFolderInput {
  @Field()
  projectId: string

  @Field()
  folderId: string
}

@InputType()
export class ReorderFoldersInput {
  @Field()
  projectId: string

  @Field(type => [String])
  folderIds: string[]
}

@InputType()
export class MoveFormsToFolderInput {
  @Field()
  projectId: string

  @Field(type => [String])
  formIds: string[]

  @Field({ nullable: true })
  @IsOptional()
  folderId?: string | null
}
