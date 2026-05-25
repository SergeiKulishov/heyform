import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { FormService } from './form.service'
import { FolderModel } from '@model'

const MAX_FOLDER_NAME_LENGTH = 100
const MAX_FOLDER_DEPTH = 2

@Injectable()
export class FolderService {
  constructor(
    @InjectModel(FolderModel.name)
    private readonly folderModel: Model<FolderModel>,
    private readonly formService: FormService
  ) {}

  async findById(folderId: string): Promise<FolderModel | null> {
    return this.folderModel.findById(folderId)
  }

  async findByProject(projectId: string): Promise<FolderModel[]> {
    return this.folderModel.find({ projectId }).sort({ parentId: 1, order: 1 })
  }

  async create(
    teamId: string,
    projectId: string,
    name: string,
    parentId?: string | null,
    color?: string,
    icon?: string
  ): Promise<FolderModel> {
    const trimmedName = name.trim().slice(0, MAX_FOLDER_NAME_LENGTH)

    if (!trimmedName) {
      throw new BadRequestException('Folder name is required')
    }

    if (parentId) {
      const parent = await this.findById(parentId)

      if (!parent) {
        throw new BadRequestException('Parent folder not found')
      }

      if (parent.projectId !== projectId) {
        throw new BadRequestException('Parent folder belongs to a different project')
      }

      if (parent.parentId !== null) {
        throw new BadRequestException(`Max nesting depth is ${MAX_FOLDER_DEPTH}`)
      }
    }

    const siblingCount = await this.folderModel.countDocuments({
      projectId,
      parentId: parentId || null
    })

    return this.folderModel.create({
      teamId,
      projectId,
      parentId: parentId || null,
      name: trimmedName,
      color: color || undefined,
      icon: icon || undefined,
      order: siblingCount
    })
  }

  async update(
    projectId: string,
    folderId: string,
    updates: { name?: string; color?: string; icon?: string }
  ): Promise<boolean> {
    const updateData: Record<string, any> = {}

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim().slice(0, MAX_FOLDER_NAME_LENGTH)

      if (!trimmedName) {
        throw new BadRequestException('Folder name is required')
      }

      updateData.name = trimmedName
    }

    if (updates.color !== undefined) {
      updateData.color = updates.color || null
    }

    if (updates.icon !== undefined) {
      updateData.icon = updates.icon || null
    }

    if (Object.keys(updateData).length === 0) {
      return true
    }

    const result = await this.folderModel.updateOne({ _id: folderId, projectId }, updateData)
    return (result as any).modifiedCount > 0
  }

  async delete(projectId: string, folderId: string): Promise<boolean> {
    const folder = await this.folderModel.findOne({ _id: folderId, projectId })

    if (!folder) {
      throw new BadRequestException('Folder not found')
    }

    const subFolders = await this.folderModel.find({ projectId, parentId: folderId })
    const subFolderIds = subFolders.map(f => f.id)
    const allFolderIds = [folderId, ...subFolderIds]

    const affectedFormIds = await this.formService.findIdsByFolderIds(allFolderIds)
    if (affectedFormIds.length > 0) {
      await this.formService.updateManyFolderIds(affectedFormIds, null)
    }

    if (subFolderIds.length > 0) {
      await this.folderModel.deleteMany({ _id: { $in: subFolderIds } })
    }

    await this.folderModel.deleteOne({ _id: folderId })

    return true
  }

  async reorder(projectId: string, folderIds: string[]): Promise<boolean> {
    const bulkOps = folderIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, projectId },
        update: { order: index }
      }
    }))

    await this.folderModel.bulkWrite(bulkOps)
    return true
  }

  async moveFormsToFolder(
    projectId: string,
    formIds: string[],
    folderId: string | null
  ): Promise<boolean> {
    if (folderId) {
      const folder = await this.folderModel.findOne({ _id: folderId, projectId })

      if (!folder) {
        throw new BadRequestException('Folder not found')
      }
    }

    await this.formService.updateManyFolderIds(formIds, folderId)

    return true
  }
}
