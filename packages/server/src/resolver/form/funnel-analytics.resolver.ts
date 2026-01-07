import { Auth, FormGuard } from '@decorator'
import { DropOffFieldType, FormDetailInput, FunnelAnalyticsType } from '@graphql'
import { flattenFields, htmlUtils } from '@heyform-inc/answer-utils'
import { helper, parseJson } from '@heyform-inc/utils'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormAnalyticService, FormService, RedisService, SubmissionService } from '@service'

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
  async funnelAnalytics(@Args('input') input: FormDetailInput): Promise<FunnelAnalyticsType> {
    const cacheKey = `form:${input.formId}:funnel-analytics`
    const cache = await this.redisService.get(cacheKey)

    if (helper.isValid(cache)) {
      return parseJson(cache)
    }

    const form = await this.formService.findById(input.formId)
    if (!form) {
      return {
        totalViews: 0,
        totalCompleted: 0,
        totalPartial: 0,
        completionRate: 0,
        dropOffByField: []
      }
    }

    const fields = flattenFields(form.fields)

    // Get counts
    const [counts, dropOffData, totalVisits] = await Promise.all([
      this.submissionService.countByCompletion(input.formId),
      this.submissionService.getDropOffAnalytics(input.formId),
      this.formAnalyticService.getTotalVisits(input.formId)
    ])

    const { completed: totalCompleted, partial: totalPartial } = counts

    // Calculate completion rate based on views
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
      totalCompleted,
      totalPartial,
      completionRate: Math.round(completionRate * 10) / 10,
      dropOffByField
    }

    // Cache for 5 minutes
    await this.redisService.set({
      key: cacheKey,
      value: JSON.stringify(result),
      duration: '5m'
    })

    return result
  }
}
