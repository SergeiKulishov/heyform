import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Answer, SubmissionCategoryEnum, SubmissionStatusEnum } from '@voxly/shared-types-enums'
import { Model } from 'mongoose'

import { FormService } from './form.service'
import { SubmissionModel } from '@model'
import { getUpdateQuery } from '@utils'
import { date, helper } from '@voxly/utils'

const { isValid } = helper

interface FindSubmissionOptions {
  formId: string
  category?: SubmissionCategoryEnum
  labelId?: string
  isCompleted?: boolean
  page?: number
  limit?: number
}

interface UpdateCategoryOptions {
  formId: string
  submissionIds: string[]
  category: SubmissionCategoryEnum
}

@Injectable()
export class SubmissionService {
  constructor(
    @InjectModel(SubmissionModel.name)
    private readonly submissionModel: Model<SubmissionModel>,
    private readonly formService: FormService
  ) {}

  async findById(id: string): Promise<SubmissionModel | null> {
    return this.submissionModel.findById(id)
  }

  async findByFormId(formId: string, submissionId: string): Promise<SubmissionModel | null> {
    return this.submissionModel.findOne({
      _id: submissionId,
      formId
    })
  }

  async findAll({
    formId,
    category,
    labelId,
    isCompleted,
    page = 1,
    limit = 30
  }: FindSubmissionOptions): Promise<SubmissionModel[]> {
    const conditions: Record<string, any> = {
      formId
    }

    // Filter by completion status
    if (isCompleted === false) {
      conditions.status = SubmissionStatusEnum.PARTIAL
    } else if (isCompleted === true) {
      conditions.status = { $in: [SubmissionStatusEnum.PUBLIC, SubmissionStatusEnum.PRIVATE] }
      conditions.isCompleted = true
    } else {
      conditions.status = SubmissionStatusEnum.PUBLIC
    }

    if (helper.isValid(category)) {
      conditions.category = category
    }

    if (helper.isValid(labelId)) {
      conditions.labels = labelId
    }

    return this.submissionModel
      .find(conditions)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({
        _id: -1
      })
  }

  async countAllWithFieldId(formId: string, fieldId: string): Promise<number> {
    return this.submissionModel.countDocuments({
      formId,
      'answers.id': fieldId,
      status: SubmissionStatusEnum.PUBLIC
    })
  }

  async findAllWithFieldId(
    formId: string,
    fieldId: string,
    page = 1,
    limit = 30
  ): Promise<SubmissionModel[]> {
    const answers = {
      $elemMatch: {
        id: fieldId as string
      }
    }
    const projections = {
      id: 1,
      answers,
      endAt: 1
    }
    const conditions: Record<string, any> = {
      formId,
      answers,
      status: SubmissionStatusEnum.PUBLIC
    }

    return this.submissionModel
      .find(conditions)
      .select(projections)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({
        endAt: -1
      })
  }

  async findAllGroupInFieldIds(
    formId: string,
    fieldIds: string[],
    limit = 10
  ): Promise<SubmissionModel[]> {
    if (helper.isEmpty(fieldIds)) {
      return []
    }

    return this.submissionModel.aggregate([
      {
        $unwind: '$answers'
      },
      {
        $match: {
          formId,
          'answers.id': {
            $in: fieldIds
          }
        }
      },
      { $sort: { endAt: -1 } },
      { $limit: limit * fieldIds.length },
      {
        $group: {
          _id: '$answers.id',
          answers: {
            $push: {
              submissionId: '$_id',
              kind: '$answers.kind',
              value: '$answers.value',
              endAt: '$endAt'
            }
          }
        }
      },
      {
        $project: {
          answers: { $slice: ['$answers', limit] }
        }
      }
    ])
  }

  public async count({
    formId,
    category,
    labelId,
    isCompleted
  }: FindSubmissionOptions): Promise<number> {
    const conditions: Record<string, any> = {
      formId
    }

    // Filter by completion status
    if (isCompleted === false) {
      conditions.status = SubmissionStatusEnum.PARTIAL
    } else if (isCompleted === true) {
      conditions.status = { $in: [SubmissionStatusEnum.PUBLIC, SubmissionStatusEnum.PRIVATE] }
      conditions.isCompleted = true
    } else {
      conditions.status = SubmissionStatusEnum.PUBLIC
    }

    if (helper.isValid(category)) {
      conditions.category = category
    }

    if (helper.isValid(labelId)) {
      conditions.labels = labelId
    }
    return this.submissionModel.countDocuments(conditions)
  }

  public async countInForm(formId: string): Promise<number> {
    return this.submissionModel.countDocuments({
      formId
    })
  }

  public async countAllInTeam(teamId: string): Promise<number> {
    const forms = await this.formService.findAllInTeam(teamId)

    if (isValid(forms)) {
      return this.countAll(
        forms.map(f => f._id),
        {
          createdAt: {
            $gte: date().startOf('month').toDate()
          }
        }
      )
    }

    return 0
  }

  public countAll(formIds: string[], filters: Record<string, any> = {}): Promise<number> {
    return new Promise((resolve, reject) => {
      this.submissionModel.countDocuments(
        {
          formId: {
            $in: formIds
          },
          ...filters
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

  public async countInForms(formIds: string[]): Promise<any> {
    return this.submissionModel
      .aggregate<SubmissionModel>([
        {
          $match: {
            formId: {
              $in: formIds
            }
          }
        },
        {
          $group: {
            _id: `$formId`,
            count: {
              $sum: 1
            }
          }
        }
      ])
      .exec()
  }

  public async countInTeams(teamIds: string[]): Promise<any> {
    return this.submissionModel
      .aggregate<SubmissionModel>([
        {
          $match: {
            teamId: {
              $in: teamIds
            }
          }
        },
        {
          $group: {
            _id: `$formId`,
            count: {
              $sum: 1
            }
          }
        }
      ])
      .exec()
  }

  public async create(submission: SubmissionModel | any): Promise<string> {
    const result = await this.submissionModel.create(submission)
    return result.id
  }

  public async maskAsPrivate(formId: string, submissionIds?: string[]): Promise<boolean> {
    const conditions: any = {
      formId
    }

    if (submissionIds) {
      conditions._id = {
        $in: submissionIds
      }
    }

    const result = await this.submissionModel.updateOne(conditions, {
      status: SubmissionStatusEnum.PRIVATE
    })
    return result?.n > 0
  }

  public async deleteByIds(formId: string, submissionIds?: string[]): Promise<boolean> {
    const conditions: any = {
      formId
    }

    if (submissionIds) {
      conditions._id = {
        $in: submissionIds
      }
    }

    const result = await this.submissionModel.deleteMany(conditions)
    return result?.n > 0
  }

  public async deleteAll(formId: string | string[]): Promise<boolean> {
    const conditions: Record<string, any> = {
      formId
    }

    if (helper.isValidArray(formId)) {
      conditions.formId = {
        $in: formId as string[]
      }
    }

    const result = await this.submissionModel.deleteMany(conditions)
    return result?.n > 0
  }

  public async updateCategory({
    formId,
    submissionIds,
    category
  }: UpdateCategoryOptions): Promise<boolean> {
    const result = await this.submissionModel.updateMany(
      {
        formId,
        _id: {
          $in: submissionIds
        }
      },
      {
        category
      }
    )
    return result?.n > 0
  }

  async findByIds(formId: string, submissionIds: string[]): Promise<SubmissionModel[]> {
    const conditions: Record<string, any> = {
      formId,
      _id: {
        $in: submissionIds
      },
      status: SubmissionStatusEnum.PUBLIC
    }
    return this.submissionModel.find(conditions)
  }

  async findAllByForm(formId: string): Promise<SubmissionModel[]> {
    let submissions = []
    const limit = 1000
    const submissionCount = await this.count({
      formId
    })

    if (submissionCount < limit) {
      submissions = await this.findAll({
        formId,
        page: 1,
        limit
      })
    } else {
      const promises = []
      const max = Math.ceil(submissionCount / limit)

      for (let i = 1; i <= max; i++) {
        promises.push(
          this.findAll({
            formId,
            page: i,
            limit
          })
        )
      }

      const result = await Promise.all(promises)
      submissions = result.reduce((prev, next) => [...prev, ...next], [])
    }

    return submissions
  }

  async createAnswer(submissionId: string, answer: Answer): Promise<boolean> {
    const result = await this.submissionModel.updateOne(
      {
        _id: submissionId
      },
      {
        $push: {
          answers: answer
        }
      }
    )
    return !!result?.ok
  }

  async updateAnswer(submissionId: string, answer: Answer): Promise<boolean> {
    const updates = {
      kind: answer.kind,
      properties: answer.properties,
      value: answer.value
    }

    const result = await this.submissionModel.updateOne(
      {
        _id: submissionId,
        'answers.id': answer.id
      },
      {
        $set: getUpdateQuery(updates, 'answers.$', false)
      }
    )
    return !!result?.ok
  }

  async analytic(formId: string, startAt: number, endAt: number) {
    return this.submissionModel.aggregate([
      {
        $match: {
          formId: formId,
          startAt: { $gte: startAt },
          endAt: { $lte: endAt }
        }
      },
      {
        $group: {
          _id: null,
          avgAverageTime: {
            $avg: { $subtract: ['$endAt', '$startAt'] }
          },
          avgSubmissionCount: { $sum: 1 }
        }
      }
    ])
  }

  /**
   * Find a partial submission by sessionId
   */
  async findBySessionId(formId: string, sessionId: string): Promise<SubmissionModel | null> {
    return this.submissionModel.findOne({
      formId,
      sessionId,
      isCompleted: false
    })
  }

  /**
   * Update a partial submission
   */
  async updatePartial(
    submissionId: string,
    updates: Partial<
      Pick<
        SubmissionModel,
        | 'answers'
        | 'hiddenFields'
        | 'variables'
        | 'lastFieldId'
        | 'lastFieldIndex'
        | 'startAt'
        | 'endAt'
        | 'status'
        | 'isCompleted'
        | 'category'
      >
    >
  ): Promise<boolean> {
    const result = await this.submissionModel.updateOne({ _id: submissionId }, { $set: updates })
    return !!result?.ok
  }

  /**
   * Get drop-off analytics - which fields users abandon the form at
   */
  async getDropOffAnalytics(formId: string): Promise<{ _id: string; count: number }[]> {
    return this.submissionModel.aggregate([
      {
        $match: {
          formId,
          status: SubmissionStatusEnum.PARTIAL,
          lastFieldId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$lastFieldId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])
  }

  /**
   * Count completed vs partial submissions
   */
  async countByCompletion(formId: string): Promise<{ completed: number; partial: number }> {
    const [completed, partial] = await Promise.all([
      this.submissionModel.countDocuments({
        formId,
        isCompleted: true,
        status: { $in: [SubmissionStatusEnum.PUBLIC, SubmissionStatusEnum.PRIVATE] }
      }),
      this.submissionModel.countDocuments({
        formId,
        status: SubmissionStatusEnum.PARTIAL
      })
    ])
    return { completed, partial }
  }

  /**
   * Get average completion time in seconds for completed submissions
   */
  async getAverageCompletionTime(formId: string): Promise<number> {
    const result = await this.submissionModel.aggregate([
      {
        $match: {
          formId,
          isCompleted: true,
          status: { $in: [SubmissionStatusEnum.PUBLIC, SubmissionStatusEnum.PRIVATE] }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: { $subtract: ['$endAt', '$startAt'] } }
        }
      }
    ])
    // Result is in seconds (timestamps are stored in seconds)
    return result[0]?.avgTime ? Math.round(result[0].avgTime) : 0
  }

  /**
   * Count completed vs partial submissions within a date range
   */
  async countByCompletionInRange(
    formId: string,
    startAt: number,
    endAt: number
  ): Promise<{ completed: number; partial: number }> {
    const [completed, partial] = await Promise.all([
      this.submissionModel.countDocuments({
        formId,
        isCompleted: true,
        status: { $in: [SubmissionStatusEnum.PUBLIC, SubmissionStatusEnum.PRIVATE] },
        endAt: { $gte: startAt, $lte: endAt }
      }),
      this.submissionModel.countDocuments({
        formId,
        status: SubmissionStatusEnum.PARTIAL,
        endAt: { $gte: startAt, $lte: endAt }
      })
    ])
    return { completed, partial }
  }

  /**
   * Get drop-off analytics within a date range
   */
  async getDropOffAnalyticsInRange(
    formId: string,
    startAt: number,
    endAt: number
  ): Promise<{ _id: string; count: number }[]> {
    return this.submissionModel.aggregate([
      {
        $match: {
          formId,
          status: SubmissionStatusEnum.PARTIAL,
          lastFieldId: { $exists: true, $ne: null },
          endAt: { $gte: startAt, $lte: endAt }
        }
      },
      {
        $group: {
          _id: '$lastFieldId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])
  }

  /**
   * Get average completion time in seconds within a date range
   */
  async getAverageCompletionTimeInRange(
    formId: string,
    startAt: number,
    endAt: number
  ): Promise<number> {
    const result = await this.submissionModel.aggregate([
      {
        $match: {
          formId,
          isCompleted: true,
          status: { $in: [SubmissionStatusEnum.PUBLIC, SubmissionStatusEnum.PRIVATE] },
          endAt: { $gte: startAt, $lte: endAt }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: { $subtract: ['$endAt', '$startAt'] } }
        }
      }
    ])
    return result[0]?.avgTime ? Math.round(result[0].avgTime) : 0
  }
}
