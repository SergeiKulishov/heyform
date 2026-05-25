import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { SubmissionService } from './submission.service'
import { FormAnalyticModel } from '@model'
import { date, helper } from '@voxly/utils'

interface FormAnalyticOptions {
  formId: string
  startAt: Date
  endAt: Date
  isNext?: boolean
}

interface FormAnalyticResult {
  avgTotalVisits: number
  avgSubmissionCount: number
  avgAverageTime: number
}

@Injectable()
export class FormAnalyticService {
  constructor(
    @InjectModel(FormAnalyticModel.name)
    private readonly formAnalyticModel: Model<FormAnalyticModel>,
    private readonly submissionService: SubmissionService
  ) {}

  public async summary({ formId, startAt, endAt, isNext }: FormAnalyticOptions) {
    const [avgTotalVisits, result] = await Promise.all([
      this.getAverageTotalVisits(formId, startAt, endAt),
      this.submissionService.analytic(
        formId,
        Math.floor(startAt.getTime() / 1000),
        Math.floor(endAt.getTime() / 1000)
      )
    ])

    const analytic = {
      avgTotalVisits: 0,
      avgSubmissionCount: 0,
      avgAverageTime: 0
    }

    if (avgTotalVisits > 0) {
      analytic.avgTotalVisits = avgTotalVisits

      if (helper.isValidArray(result)) {
        analytic.avgSubmissionCount = result[0].avgSubmissionCount
        analytic.avgAverageTime = result[0].avgAverageTime
      }

      return analytic
    } else if (isNext) {
      return analytic
    } else {
      return {} as FormAnalyticResult
    }
  }

  public async getAverageTotalVisits(formId: string, startAt: Date, endAt: Date): Promise<number> {
    const result = await this.formAnalyticModel.aggregate([
      {
        $match: {
          formId,
          createdAt: {
            $gte: startAt,
            $lte: endAt
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTotalVisits: { $avg: '$totalVisits' }
        }
      }
    ])

    return result[0]?.avgTotalVisits || 0
  }

  public async updateTotalVisits(formId: string): Promise<void> {
    const today = date()

    await this.formAnalyticModel.updateOne(
      {
        formId,
        createdAt: {
          $gte: today.startOf('day'),
          $lte: today.endOf('day')
        }
      },
      {
        $inc: {
          totalVisits: 1
        }
      },
      { upsert: true }
    )
  }

  public async delete(formId: string | string[]): Promise<boolean> {
    let result: any

    if (helper.isValidArray(formId)) {
      result = await this.formAnalyticModel.deleteMany({
        formId: {
          $in: formId as string[]
        }
      })
    } else {
      result = await this.formAnalyticModel.deleteOne({
        formId: formId as string
      })
    }

    return result?.n > 0
  }

  /**
   * Get total visits for a form (all time)
   */
  public async getTotalVisits(formId: string): Promise<number> {
    const result = await this.formAnalyticModel.aggregate([
      {
        $match: { formId }
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: '$totalVisits' }
        }
      }
    ])

    return result[0]?.totalVisits || 0
  }

  /**
   * Get total visits for a form within a date range
   */
  public async getTotalVisitsInRange(formId: string, startAt: Date, endAt: Date): Promise<number> {
    const result = await this.formAnalyticModel.aggregate([
      {
        $match: {
          formId,
          createdAt: {
            $gte: startAt,
            $lte: endAt
          }
        }
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: '$totalVisits' }
        }
      }
    ])

    return result[0]?.totalVisits || 0
  }
}
