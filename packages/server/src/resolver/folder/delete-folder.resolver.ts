import { PermissionKey } from '@common/permission'

import { Auth, ProjectGuard, RequirePermission } from '@decorator'
import { DeleteFolderInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FolderService } from '@service'

@Resolver()
@Auth()
export class DeleteFolderResolver {
  constructor(private readonly folderService: FolderService) {}

  @Mutation(returns => Boolean)
  @ProjectGuard()
  @RequirePermission(PermissionKey.FORM_DELETE)
  async deleteFolder(@Args('input') input: DeleteFolderInput): Promise<boolean> {
    return this.folderService.delete(input.projectId, input.folderId)
  }
}
