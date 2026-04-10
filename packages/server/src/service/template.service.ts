import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import {
  FormField,
  FormKindEnum,
  HiddenField,
  InteractiveModeEnum,
  ThemeSettings
} from '@voxly/shared-types-enums'
import { Logic, Variable } from '@voxly/shared-types-enums'
import { Model } from 'mongoose'

import { TemplateModel } from '@model'
import { helper } from '@voxly/utils'

interface CreateTemplateData {
  teamId: string
  memberId: string
  name: string
  category: string
  description?: string
  fields: FormField[]
  hiddenFields?: HiddenField[]
  logics?: Logic[]
  variables?: Variable[]
  themeSettings?: ThemeSettings
  kind: FormKindEnum
  interactiveMode: InteractiveModeEnum
}

@Injectable()
export class TemplateService {
  constructor(
    @InjectModel(TemplateModel.name)
    private readonly templateModel: Model<TemplateModel>
  ) {}

  async findById(id: string): Promise<TemplateModel | null> {
    return this.templateModel.findById(id)
  }

  async findBySlug(slug: string): Promise<TemplateModel | null> {
    return this.templateModel.findOne({ slug })
  }

  async findAll(keyword?: string, limit?: number): Promise<TemplateModel[]> {
    const conditions: any = {
      published: true,
      teamId: { $exists: false }
    }

    if (keyword) {
      conditions.name = new RegExp(keyword, 'i')
    }

    if (helper.isValid(limit) && limit! > 0) {
      return this.templateModel
        .find(conditions)
        .sort({
          usedCount: -1
        })
        .limit(limit!)
    }

    return this.templateModel.find(conditions).sort({
      _id: -1
    })
  }

  async findByTeam(teamId: string, keyword?: string): Promise<TemplateModel[]> {
    const conditions: any = {
      teamId,
      published: true
    }

    if (keyword) {
      conditions.name = new RegExp(keyword, 'i')
    }

    return this.templateModel.find(conditions).sort({ _id: -1 })
  }

  async create(data: CreateTemplateData): Promise<string> {
    const template = await this.templateModel.create({
      ...data,
      published: true,
      usedCount: 0
    })
    return template._id.toString()
  }

  async delete(templateId: string, teamId: string): Promise<boolean> {
    const result = await this.templateModel.deleteOne({
      _id: templateId,
      teamId
    })
    return result.deletedCount > 0
  }

  public async updateUsedCount(templateId: string): Promise<any> {
    return this.templateModel.updateOne(
      {
        _id: templateId
      },
      {
        $inc: {
          usedCount: 1
        }
      }
    )
  }
}
