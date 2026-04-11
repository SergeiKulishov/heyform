import { PermissionKey } from '@common/permission'

import { Auth, ProjectGuard, RequirePermission } from '@decorator'
import { UpdateFolderInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FolderService } from '@service'

@Resolver()
@Auth()
export class UpdateFolderResolver {
  constructor(private readonly folderService: FolderService) {}

  @Mutation(returns => Boolean)
  @ProjectGuard()
  @RequirePermission(PermissionKey.FORM_EDIT)
  async updateFolder(@Args('input') input: UpdateFolderInput): Promise<boolean> {
    return this.folderService.update(input.projectId, input.folderId, {
      name: input.name,
      color: input.color
    })
  }
}
