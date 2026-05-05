import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { CaptchaKindEnum, FormField, FormStatusEnum } from '@voxly/shared-types-enums'
import { Queue } from 'bull'
import { Model } from 'mongoose'

import { RedisService } from './redis.service'
import { TeamService } from './team.service'
import { GOOGLE_RECAPTCHA_KEY, PUBLIC_FORM_CACHE_TTL } from '@environments'
import { FormModel } from '@model'
import { mapToObject } from '@utils'
import { getUpdateQuery } from '@utils'
import { helper, pickObject, timestamp } from '@voxly/utils'

function publicFormCacheKey(formId: string): string {
  return `public-form:${formId}`
}

interface UpdateFiledOptions {
  formId: string
  fieldId: string
  updates: Record<string, any>
}

@Injectable()
export class FormService {
  constructor(
    @InjectModel(FormModel.name)
    private readonly formModel: Model<FormModel>,
    private readonly teamService: TeamService,
    private readonly redisService: RedisService,
    @InjectQueue('TranslateFormQueue')
    private readonly translateFormQueue: Queue
  ) {}

  async findById(id: string): Promise<FormModel | null> {
    return this.formModel.findById(id)
  }

  async findByIdInTeam(id: string, teamId: string) {
    return this.formModel.findOne({
      _id: id,
      teamId
    })
  }

  async findAllInTeam(teamId: string | string[]): Promise<FormModel[]> {
    const conditions: any = {
      teamId
    }

    if (helper.isValidArray(teamId)) {
      conditions.teamId = {
        $in: teamId
      }
    }

    return this.formModel.find(conditions)
  }

  async findRecentInTeam(
    teamId: string,
    projectIds: string[],
    limit = 10,
    status = FormStatusEnum.NORMAL
  ): Promise<FormModel[]> {
    const conditions: Record<string, any> = {
      teamId,
      status
    }

    if (helper.isValidArray(projectIds)) {
      conditions.projectId = {
        $in: projectIds
      }
    }

    return this.formModel
      .find(conditions)
      .sort({
        updatedAt: -1
      })
      .limit(limit)
  }

  async searchInTeam(teamId: string, projectIds: string[], keyword: string): Promise<FormModel[]> {
    const conditions: Record<string, any> = {
      teamId,
      name: new RegExp(keyword, 'i')
    }

    if (helper.isValidArray(projectIds)) {
      conditions.projectId = {
        $in: projectIds
      }
    }

    return this.formModel.find(conditions).sort({
      updatedAt: -1
    })
  }

  async findAllInTrash(): Promise<FormModel[]> {
    return this.formModel.find({
      retentionAt: {
        $lte: timestamp(),
        $gt: 0
      },
      status: FormStatusEnum.TRASH
    })
  }

  async findAll(
    projectId: string | string[],
    status: FormStatusEnum,
    keyword?: string,
    folderId?: string | null,
    tags?: string[]
  ): Promise<FormModel[]> {
    const conditions: any = {
      projectId,
      status
    }

    if (helper.isValidArray(projectId)) {
      conditions.projectId = {
        $in: projectId
      }
    }

    if (keyword) {
      conditions.name = new RegExp(keyword, 'i')
    }

    if (folderId !== undefined) {
      conditions.folderId = folderId
    }

    if (tags && tags.length > 0) {
      conditions.tags = { $all: tags }
    }

    return this.formModel.find(conditions).sort({
      updatedAt: -1
    })
  }

  async findAllByFieldLength(maxLength = 2) {
    return this.formModel.find({
      $where: `this.fields.length <= ${maxLength}`
    } as any)
  }

  public async countMaps(projectIds: string[]): Promise<any> {
    return this.formModel
      .aggregate<FormModel>([
        { $match: { projectId: { $in: projectIds } } },
        { $group: { _id: `$projectId`, count: { $sum: 1 } } }
      ])
      .exec()
  }

  async _internalCountAll() {
    return new Promise((resolve, reject) => {
      this.formModel.countDocuments({}, (err, count) => {
        if (err) {
          reject(err)
        } else {
          resolve(count)
        }
      })
    })
  }

  async countAll(teamId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.formModel.countDocuments(
        {
          teamId
        },
        (err, count) => {
          if (err) {
            reject(err)
          } else {
            resolve(count)
          }
        }
      )
    })
  }

  async countAllInTeams(teamIds: string[]): Promise<any> {
    return this.formModel
      .aggregate<FormModel>([
        {
          $match: {
            teamId: {
              $in: teamIds
            }
          }
        },
        {
          $group: {
            _id: `$teamId`,
            count: {
              $sum: 1
            }
          }
        }
      ])
      .exec()
  }

  public async create(form: FormModel | any): Promise<string> {
    const result = await this.formModel.create(form)
    return result.id
  }

  public async update(
    formId: string,
    updates: Record<string, any>,
    conditions?: Record<string, any>
  ): Promise<boolean> {
    const result = await this.formModel.updateOne(
      {
        _id: formId,
        ...conditions
      },
      updates
    )
    await this.redisService.del(publicFormCacheKey(formId))
    return !!result?.ok
  }

  public async updateMany(formIds: string[], updates: Record<string, any>): Promise<boolean> {
    const result = await this.formModel.updateMany(
      {
        _id: {
          $in: formIds
        }
      },
      updates
    )
    await Promise.all(formIds.map(id => this.redisService.del(publicFormCacheKey(id))))
    return !!result?.ok
  }

  public async delete(formId: string | string[]): Promise<boolean> {
    let result: any

    if (helper.isValidArray(formId)) {
      result = await this.formModel.deleteMany({
        _id: {
          $in: formId as string[]
        },
        status: FormStatusEnum.TRASH
      })
      await Promise.all(
        (formId as string[]).map(id => this.redisService.del(publicFormCacheKey(id)))
      )
    } else {
      result = await this.formModel.deleteOne({
        _id: formId as string,
        status: FormStatusEnum.TRASH
      })
      await this.redisService.del(publicFormCacheKey(formId as string))
    }

    return result?.n > 0
  }

  public async createField(formId: string, field: FormField): Promise<boolean> {
    const result = await this.formModel.updateOne(
      {
        _id: formId
      },
      {
        $push: {
          fields: field
        }
      }
    )
    await this.redisService.del(publicFormCacheKey(formId))
    return !!result?.ok
  }

  public async updateField({ formId, fieldId, updates }: UpdateFiledOptions): Promise<boolean> {
    const result = await this.formModel.updateOne(
      {
        _id: formId,
        'fields.id': fieldId
      },
      {
        $set: getUpdateQuery(updates, 'fields.$')
      }
    )
    await this.redisService.del(publicFormCacheKey(formId))
    return !!result?.ok
  }

  public async deleteField(formId: string, fieldId: string): Promise<boolean> {
    const result = await this.formModel.updateOne(
      {
        _id: formId
      },
      {
        $pull: {
          fields: {
            id: fieldId
          }
        }
      },
      {
        // @ts-ignore
        safe: true,
        multi: true
      }
    )
    await this.redisService.del(publicFormCacheKey(formId))
    return !!result?.ok
  }

  async checkQuota(teamId: string, formLimit: number): Promise<boolean> {
    const count = await this.countAll(teamId)

    if (formLimit !== -1 && count >= formLimit) {
      throw new BadRequestException({
        code: 'FORM_QUOTA_EXCEED',
        message: 'The form quota exceeds, new forms are no longer accepted'
      })
    }

    return true
  }

  public async findPublicForm(formId: string): Promise<Record<string, any> | undefined> {
    const cacheKey = publicFormCacheKey(formId)
    const cached = await this.redisService.get(cacheKey)

    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        await this.redisService.del(cacheKey)
      }
    }

    const form = await this.findById(formId)

    if (!form || !form.settings.active) {
      const inactive = {
        id: formId,
        teamId: form?.teamId,
        projectId: form?.projectId,
        memberId: form?.memberId,
        name: form?.name,
        fields: [],
        hiddenFields: [],
        settings: {
          active: false,
          ...pickObject(form?.settings || {}, [
            'enableClosedMessage',
            'closedFormTitle',
            'closedFormDescription'
          ])
        },
        themeSettings: form?.themeSettings
      }
      await this.redisService.set({
        key: cacheKey,
        value: JSON.stringify(inactive),
        duration: PUBLIC_FORM_CACHE_TTL
      })
      return inactive
    }

    const now = timestamp()
    if (
      form.settings.enableExpirationDate &&
      (now < form.settings.enabledAt ||
        (now > form.settings.closedAt && form.settings.closedAt > 0))
    ) {
      const expired = {
        id: formId,
        teamId: form.teamId,
        projectId: form.projectId,
        memberId: form.memberId,
        name: form?.name,
        fields: [],
        hiddenFields: [],
        settings: {
          active: false,
          ...pickObject(form?.settings || {}, [
            'enableClosedMessage',
            'closedFormTitle',
            'closedFormDescription'
          ])
        },
        themeSettings: form.themeSettings
      }
      await this.redisService.set({
        key: cacheKey,
        value: JSON.stringify(expired),
        duration: PUBLIC_FORM_CACHE_TTL
      })
      return expired
    }

    const masked: Record<string, any> = pickObject(form.toObject(), [
      ['_id', 'id'],
      'teamId',
      'projectId',
      'memberId',
      'nameSchema',
      'name',
      'interactiveMode',
      'kind',
      'hiddenFields',
      'logics',
      'variables',
      'themeSettings'
    ])

    //!!! Do not disclose form password to the front end
    masked.settings = pickObject(form.settings, [
      'active',
      'enableTimeLimit',
      'timeLimit',
      'captchaKind',
      'requirePassword',
      'enableProgress',
      'enableQuestionList',
      'locale',
      'languages',
      'enableClosedMessage',
      'closedFormTitle',
      'closedFormDescription',
      'removeBranding'
    ])

    masked.fields = form.fields.map(field => {
      //!!! Do not disclose scope and other information to the front end
      if (field.properties) {
        field.properties.score = undefined

        if (field.properties.choices) {
          field.properties.choices = field.properties.choices.map(choice => {
            choice.score = undefined
            choice.isExpected = undefined
            return choice
          })
        }
      }

      return field
    })
    masked.translations = mapToObject(form.translations)

    const team = await this.teamService.findById(form.teamId)

    masked.settings.removeBranding = team.removeBranding

    if (form.settings?.captchaKind === CaptchaKindEnum.GOOGLE_RECAPTCHA) {
      masked.settings.googleRecaptchaKey = GOOGLE_RECAPTCHA_KEY
    }

    await this.redisService.set({
      key: cacheKey,
      value: JSON.stringify(masked),
      duration: PUBLIC_FORM_CACHE_TTL
    })

    return masked
  }

  public addTranslateQueue(formId: string, languages: string[]) {
    languages.forEach(language => {
      this.translateFormQueue.add({
        formId,
        language
      })
    })
  }
}
