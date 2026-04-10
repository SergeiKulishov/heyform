import { Auth, ProjectGuard } from '@decorator'
import { FolderType, FoldersInput } from '@graphql'
import { FolderModel } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FolderService } from '@service'

@Resolver()
@Auth()
export class FoldersResolver {
  constructor(private readonly folderService: FolderService) {}

  @Query(returns => [FolderType])
  @ProjectGuard()
  async folders(@Args('input') input: FoldersInput): Promise<FolderModel[]> {
    return this.folderService.findByProject(input.projectId)
  }
}
