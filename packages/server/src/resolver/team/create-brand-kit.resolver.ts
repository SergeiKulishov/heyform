import { Auth, Roles, Team, TeamGuard } from '@decorator'
import { CreateBrandKitInput } from '@graphql'
import { TeamModel, TeamRoleEnum } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { BrandKitService } from '@service'

@Resolver()
@Auth()
export class CreateBrandKitResolver {
  constructor(private readonly brandKitService: BrandKitService) {}

  @Mutation(returns => String)
  @TeamGuard()
  @Roles(TeamRoleEnum.ADMIN)
  async createBrandKit(
    @Team() team: TeamModel,
    @Args('input') input: CreateBrandKitInput
  ): Promise<string> {
    const brandKit = await this.brandKitService.findByTeamId(team.id)

    if (brandKit) {
      return brandKit.id
    }

    return this.brandKitService.create({
      teamId: team.id,
      logo: input.logo,
      theme: input.theme
    })
  }
}
