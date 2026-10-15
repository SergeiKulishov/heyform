import { PermissionKey } from '@common/permission'
import { BadRequestException } from '@nestjs/common'

import { Auth, GraphqlRequest, RequirePermission, Team, TeamGuard } from '@decorator'
import {
  ApiTokenListInput,
  ApiTokenType,
  CreateApiTokenInput,
  CreateApiTokenType,
  RevokeApiTokenInput
} from '@graphql'
import { TeamModel } from '@model'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { ApiTokenService } from '@service'

@Resolver()
@Auth()
export class ApiTokenResolver {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Query(returns => [ApiTokenType])
  @TeamGuard()
  @RequirePermission(PermissionKey.WORKSPACE_SETTINGS)
  async apiTokens(
    @Team() team: TeamModel,
    @Args('input') _input: ApiTokenListInput
  ): Promise<ApiTokenType[]> {
    const records = await this.apiTokenService.findByTeam(team.id)

    return records.map(record => ({
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      scope: record.scope,
      lastUsedAt: record.lastUsedAt,
      createdAt: record.get('createdAt')
    }))
  }

  @Mutation(returns => CreateApiTokenType)
  @TeamGuard()
  @RequirePermission(PermissionKey.WORKSPACE_SETTINGS)
  async createApiToken(
    @Team() team: TeamModel,
    @Args('input') input: CreateApiTokenInput,
    @GraphqlRequest() req: any
  ): Promise<CreateApiTokenType> {
    if (!['read', 'read_write'].includes(input.scope)) {
      throw new BadRequestException('Invalid token scope')
    }

    const { record, token } = await this.apiTokenService.create(
      team.id,
      req.user.id,
      input.name,
      input.scope
    )

    return {
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      scope: record.scope,
      lastUsedAt: record.lastUsedAt,
      createdAt: record.get('createdAt'),
      token
    }
  }

  @Mutation(returns => Boolean)
  @TeamGuard()
  @RequirePermission(PermissionKey.WORKSPACE_SETTINGS)
  async revokeApiToken(
    @Team() team: TeamModel,
    @Args('input') input: RevokeApiTokenInput
  ): Promise<boolean> {
    return this.apiTokenService.revoke(team.id, input.tokenId)
  }
}
