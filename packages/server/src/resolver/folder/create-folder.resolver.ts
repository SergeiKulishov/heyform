import { PermissionKey } from '@common/permission'

import { Auth, ProjectGuard, RequirePermission, Team } from '@decorator'
import { CreateFolderInput, FolderType } from '@graphql'
import { FolderModel, TeamModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FolderService } from '@service'

@Resolver()
@Auth()
export class CreateFolderResolver {
  constructor(private readonly folderService: FolderService) {}

  @Mutation(returns => FolderType)
  @ProjectGuard()
  @RequirePermission(PermissionKey.FORM_CREATE)
  async createFolder(
    @Team() team: TeamModel,
    @Args('input') input: CreateFolderInput
  ): Promise<FolderModel> {
    return this.folderService.create(
      team.id,
      input.projectId,
      input.name,
      input.parentId,
      input.color,
      input.icon
    )
  }
}
