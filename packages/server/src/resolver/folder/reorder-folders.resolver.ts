import { PermissionKey } from '@common/permission'

import { Auth, ProjectGuard, RequirePermission } from '@decorator'
import { ReorderFoldersInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FolderService } from '@service'

@Resolver()
@Auth()
export class ReorderFoldersResolver {
  constructor(private readonly folderService: FolderService) {}

  @Mutation(returns => Boolean)
  @ProjectGuard()
  @RequirePermission(PermissionKey.FORM_EDIT)
  async reorderFolders(@Args('input') input: ReorderFoldersInput): Promise<boolean> {
    return this.folderService.reorder(input.projectId, input.folderIds)
  }
}
