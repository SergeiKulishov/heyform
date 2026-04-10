import { FormModel, FormTheme } from '@voxly/shared-types-enums'

import { FormType } from '@/types/index.ts'

import { UserType } from './user'

export interface FolderType {
  id: string
  teamId: string
  projectId: string
  parentId: string | null
  name: string
  order: number
}

export interface ProjectType {
  id: string
  teamId: string
  name: string
  ownerId: string
  formCount: number
  isOwner?: boolean
  members: string[]
  forms: FormModel
}

export interface BrandKitType {
  id: string
  logo: string
  theme: FormTheme
}

export interface WorkspaceType {
  id: string
  name: string
  ownerId: string
  avatar?: string
  removeBranding?: boolean
  inviteCode: string
  inviteCodeExpireAt?: number
  allowJoinByInviteLink: boolean
  storageQuota: number
  memberCount: number
  additionalSeats: number
  contactCount: number
  brandKits: BrandKitType[]
  isOwner?: boolean
  role?: number
  permissionMatrix?: Record<string, number[]>
  owner?: UserType
  createdAt?: number
  projects: ProjectType[]
  members: UserType[]
  aiKey?: string
  aiModel?: string
  customSharingURL?: string
}

export interface MemberType {
  id: string
  name: string
  email: string
  avatar: string
  role: number
  isOwner: boolean
  isYou: boolean
  lastSeenAt?: number
}

export interface DocumentType {
  id: string
  title: string
  description: string
}

export interface SearchResultType {
  forms: FormType[]
  docs: DocumentType[]
}
