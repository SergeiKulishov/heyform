import { Auth, FormGuard } from '@decorator'
import { DropOffFieldType, FormAnalyticInput, FunnelAnalyticsType } from '@graphql'
import { FormAnalyticRangeEnum } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormAnalyticService, FormService, RedisService, SubmissionService } from '@service'
import { flattenFields, htmlUtils } from '@voxly/answer-utils'
import { date, helper, parseJson } from '@voxly/utils'

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim()

const getFieldTitle = (field: any): string => {
  if (!field?.title) return ''
  if (helper.isArray(field.title)) {
    return stripHtml(htmlUtils.serialize(field.title))
  }
  return typeof field.title === 'string' ? stripHtml(field.title) : ''
}

@Resolver()
@Auth()
export class FunnelAnalyticsResolver {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly formService: FormService,
    private readonly formAnalyticService: FormAnalyticService,
    private readonly redisService: RedisService
  ) {}

  @Query(returns => FunnelAnalyticsType)
  @FormGuard()
  async funnelAnalytics(@Args('input') input: FormAnalyticInput): Promise<FunnelAnalyticsType> {
    const cacheKey = `form:${input.formId}:funnel-analytics:${input.range}`
    const cache = await this.redisService.get(cacheKey)

    if (helper.isValid(cache)) {
      return parseJson(cache)
    }

    const form = await this.formService.findById(input.formId)
    if (!form) {
      return {
        totalViews: 0,
        totalStarted: 0,
        totalCompleted: 0,
        totalPartial: 0,
        startRate: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        dropOffByField: []
      }
    }

    // Calculate date range based on input.range
    const now = date().endOf('day')
    let startAt: Date

    switch (input.range) {
      case FormAnalyticRangeEnum.WEEK:
        startAt = now.subtract(7, 'days').startOf('day').toDate()
        break
      case FormAnalyticRangeEnum.MONTH:
        startAt = now.subtract(1, 'months').startOf('day').toDate()
        break
      case FormAnalyticRangeEnum.THREE_MONTH:
        startAt = now.subtract(3, 'months').startOf('day').toDate()
        break
      case FormAnalyticRangeEnum.SIX_MONTH:
        startAt = now.subtract(6, 'months').startOf('day').toDate()
        break
      case FormAnalyticRangeEnum.YEAR:
        startAt = now.subtract(1, 'years').startOf('day').toDate()
        break
    }

    const endAt = now.toDate()
    const startAtTimestamp = Math.floor(startAt.getTime() / 1000)
    const endAtTimestamp = Math.floor(endAt.getTime() / 1000)

    const fields = flattenFields(form.fields)

    // Get counts with date range filter
    const [counts, dropOffData, totalVisits, avgCompletionTime] = await Promise.all([
      this.submissionService.countByCompletionInRange(
        input.formId,
        startAtTimestamp,
        endAtTimestamp
      ),
      this.submissionService.getDropOffAnalyticsInRange(
        input.formId,
        startAtTimestamp,
        endAtTimestamp
      ),
      this.formAnalyticService.getTotalVisitsInRange(input.formId, startAt, endAt),
      this.submissionService.getAverageCompletionTimeInRange(
        input.formId,
        startAtTimestamp,
        endAtTimestamp
      )
    ])

    const { completed: totalCompleted, partial: totalPartial } = counts
    const totalStarted = totalCompleted + totalPartial

    // Calculate rates based on views
    const startRate = totalVisits > 0 ? Math.min(100, (totalStarted / totalVisits) * 100) : 0
    const completionRate = totalVisits > 0 ? Math.min(100, (totalCompleted / totalVisits) * 100) : 0

    // Map drop-off data to include field titles
    const dropOffByField: DropOffFieldType[] = dropOffData.map(d => {
      const field = fields.find(f => f.id === d._id)
      const fieldTitle = getFieldTitle(field) || `Field ${d._id.substring(0, 8)}`

      return {
        fieldId: d._id,
        fieldTitle,
        count: d.count,
        percentage: totalPartial > 0 ? Math.round((d.count / totalPartial) * 100 * 10) / 10 : 0
      }
    })

    const result: FunnelAnalyticsType = {
      totalViews: totalVisits,
      totalStarted,
      totalCompleted,
      totalPartial,
      startRate: Math.round(startRate * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      averageCompletionTime: avgCompletionTime,
      dropOffByField
    }

    // Cache for 1 minute (cache is invalidated on new submissions)
    await this.redisService.set({
      key: cacheKey,
      value: JSON.stringify(result),
      duration: '1m'
    })

    return result
  }
}
