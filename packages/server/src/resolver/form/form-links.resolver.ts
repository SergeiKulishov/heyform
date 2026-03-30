import { Auth, FormGuard } from '@decorator'
import { FormLinkType, FormLinksInput } from '@graphql'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormLinkService } from '@service'

@Resolver()
@Auth()
export class FormLinksResolver {
  constructor(private readonly formLinkService: FormLinkService) {}

  @Query(returns => [FormLinkType])
  @FormGuard()
  async formLinks(@Args('input') input: FormLinksInput): Promise<FormLinkType[]> {
    const links = await this.formLinkService.findByFormId(input.formId)

    const kuttIds = links.map(l => l.kuttId)
    const visitCounts = await this.formLinkService.getKuttVisitCounts(kuttIds)

    return links.map(link => ({
      id: link.id,
      shortLink: link.shortLink,
      target: link.target,
      source: link.source,
      visitCount: visitCounts.get(link.kuttId) ?? 0,
      createdAt: (link as any).createdAt?.toISOString?.() ?? String((link as any).createdAt)
    }))
  }
}
