import { Auth, FormGuard, Roles } from '@decorator'
import { UpdateFormThemeInput } from '@graphql'
import { TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService } from '@service'

@Resolver()
@Auth()
export class UpdateFormThemeResolver {
  constructor(private readonly formService: FormService) {}

  @Mutation(returns => Boolean)
  @FormGuard()
  @Roles(TeamRoleEnum.ADMIN, TeamRoleEnum.COLLABORATOR)
  async updateFormTheme(@Args('input') input: UpdateFormThemeInput): Promise<boolean> {
    return await this.formService.update(input.formId, {
      themeSettings: {
        logo: input.logo,
        theme: input.theme
      }
    })
  }
}
