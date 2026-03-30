import { BadRequestException } from '@nestjs/common'

import { Auth, FormGuard } from '@decorator'
import { FormLinkStatsInput, FormLinkStatsType } from '@graphql'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormLinkService } from '@service'

@Resolver()
@Auth()
export class FormLinkStatsResolver {
  constructor(private readonly formLinkService: FormLinkService) {}

  @Query(returns => FormLinkStatsType, { nullable: true })
  @FormGuard()
  async formLinkStats(@Args('input') input: FormLinkStatsInput): Promise<FormLinkStatsType | null> {
    const link = await this.formLinkService.findById(input.id)

    if (!link) {
      throw new BadRequestException('Link not found')
    }

    if (link.formId !== input.formId) {
      throw new BadRequestException('Link does not belong to this form')
    }

    return this.formLinkService.getKuttLinkStats(link.kuttId)
  }
}
