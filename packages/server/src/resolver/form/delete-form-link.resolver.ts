import { BadRequestException } from '@nestjs/common'

import { Auth, FormGuard } from '@decorator'
import { DeleteFormLinkInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormLinkService } from '@service'

@Resolver()
@Auth()
export class DeleteFormLinkResolver {
  constructor(private readonly formLinkService: FormLinkService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  async deleteFormLink(@Args('input') input: DeleteFormLinkInput): Promise<boolean> {
    const link = await this.formLinkService.findById(input.id)

    if (!link) {
      throw new BadRequestException('Link not found')
    }

    if (link.formId !== input.formId) {
      throw new BadRequestException('Link does not belong to this form')
    }

    await this.formLinkService.delete(input.id)
    return true
  }
}
