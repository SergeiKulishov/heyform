import { PermissionKey } from '@common/permission'

import { Auth, RequirePermission, Team, TeamGuard, User } from '@decorator'
import { APP_HOMEPAGE_URL } from '@environments'
import { InviteMemberInput } from '@graphql'
import { TeamModel, UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { MailService, TeamService, UserService } from '@service'
import { helper } from '@voxly/utils'

@Resolver()
@Auth()
export class InviteMemberResolver {
  constructor(
    private readonly userService: UserService,
    private readonly teamService: TeamService,
    private readonly mailService: MailService
  ) {}

  @Mutation(returns => Boolean)
  @TeamGuard()
  @RequirePermission(PermissionKey.WORKSPACE_MEMBERS_INVITE)
  async inviteMember(
    @Team() team: TeamModel,
    @User() user: UserModel,
    @Args('input') input: InviteMemberInput
  ): Promise<boolean> {
    let exists: string[] = []
    const members = await this.teamService.findMembersInTeam(input.teamId)

    if (helper.isValid(members)) {
      exists = (await this.userService.findAll(members.map(member => member.memberId))).map(
        row => row.email
      )
    }

    const emails = helper.uniqueArray(input.emails.filter(email => !exists.includes(email)))

    for (const email of emails) {
      this.mailService.teamInvitation(
        email,
        {
          userName: user.name,
          teamName: team.name,
          link: `${APP_HOMEPAGE_URL}/workspace/${team.id}/invitation/${team.inviteCode}`
        },
        user.lang
      )
    }

    return true
  }
}
