import { PermissionKey } from '@common/permission'

import { Auth, ProjectGuard, RequirePermission } from '@decorator'
import { MoveFormsToFolderInput } from '@graphql'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FolderService } from '@service'

@Resolver()
@Auth()
export class MoveFormsToFolderResolver {
  constructor(private readonly folderService: FolderService) {}

  @Mutation(returns => Boolean)
  @ProjectGuard()
  @RequirePermission(PermissionKey.FORM_EDIT)
  async moveFormsToFolder(@Args('input') input: MoveFormsToFolderInput): Promise<boolean> {
    return this.folderService.moveFormsToFolder(
      input.projectId,
      input.formIds,
      input.folderId ?? null
    )
  }
}
