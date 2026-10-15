import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

import { ApiTokenService, TeamService } from '@service'

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly apiTokenService: ApiTokenService,
    private readonly teamService: TeamService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const authorization = req.get('authorization') || req.headers['authorization']

    if (!authorization || typeof authorization !== 'string') {
      throw new UnauthorizedException('Invalid API token')
    }

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid API token')
    }

    const token = authorization.slice(7)

    if (!token.startsWith('hfm_')) {
      throw new UnauthorizedException('Invalid API token')
    }

    const record = await this.apiTokenService.verify(token)

    if (!record) {
      throw new UnauthorizedException('Invalid API token')
    }

    const team = await this.teamService.findById(record.teamId)

    if (!team) {
      throw new UnauthorizedException('Invalid API token')
    }

    req.apiToken = record
    req.team = team

    return true
  }
}
