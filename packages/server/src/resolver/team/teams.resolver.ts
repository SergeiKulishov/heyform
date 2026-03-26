import { Auth, User } from '@decorator'
import { TeamType } from '@graphql'
import { TeamModel, UserModel } from '@model'
import { Query, Resolver } from '@nestjs/graphql'
import { BrandKitService, FormService, ProjectService, TeamService } from '@service'
import { helper } from '@voxly/utils'

@Resolver()
@Auth()
export class TeamsResolver {
  constructor(
    private readonly teamService: TeamService,
    private readonly formService: FormService,
    private readonly projectService: ProjectService,
    private readonly brandKitService: BrandKitService
  ) {}

  @Query(returns => [TeamType])
  async teams(@User() user: UserModel): Promise<TeamModel[]> {
    const teams = await this.teamService.findAll(user.id)

    if (helper.isEmpty(teams)) {
      return []
    }

    const teamIds = teams.map(row => row.id)
    const projectIds = await this.projectService.findProjectsByMemberId(user.id)

    const [memberCountMaps, projects, projectMembers, formCountMaps, brandKits, memberRelations] =
      await Promise.all([
        this.teamService.memberCountMaps(teamIds),
        this.projectService.findByIds(projectIds),
        this.projectService.findMembers(projectIds),
        this.formService.countMaps(projectIds),
        this.brandKitService.findAllInTeams(teamIds),
        this.teamService.findMemberRelationInTeams(user.id, teamIds)
      ])

    return teams.map(team => {
      team.projects = projects
        .filter(row => row.teamId === team.id)
        .map(project => {
          project.members = projectMembers
            .filter(m => m.projectId === project.id)
            .map(m => m.memberId)
          project.formCount = formCountMaps.find(m => m._id === project.id)?.count || 0
          return project
        })
      team.isOwner = team.ownerId === user.id
      team.memberCount = memberCountMaps.find(row => row._id === team.id)?.count || 0
      team.brandKits = brandKits.filter(row => row.teamId === team.id)

      const memberRelation = memberRelations.find(m => m.teamId === team.id)
      team.role = memberRelation?.role

      return team
    })
  }
}
