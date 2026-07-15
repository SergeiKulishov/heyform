import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { IS_PUBLIC_KEY, PERMISSION_KEY, ROLES_KEY } from '@decorator'
import { TeamRoleEnum } from '@model'
import { GqlExecutionContext } from '@nestjs/graphql'
import { FormService, ProjectService, TeamService } from '@service'
import { requestParser } from '@utils'
import { helper, timestamp } from '@voxly/utils'

import { DEFAULT_PERMISSION_MATRIX, PermissionKey } from '../permission'

export enum PermissionScopeEnum {
  team = 0,
  project,
  form
}

export class PermissionGuard implements CanActivate {
  private readonly reflector: Reflector

  constructor(
    @Inject('TeamService') private readonly teamService: TeamService,
    @Inject('ProjectService') private readonly projectService: ProjectService,
    @Inject('FormService') private readonly formService: FormService
  ) {
    this.reflector = new Reflector()
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ])

    if (isPublic) {
      return true
    }

    const ctx = GqlExecutionContext.create(context)
    let { req } = ctx.getContext()
    let args = ctx.getArgs()

    if (helper.isEmpty(req)) {
      req = context.switchToHttp().getRequest()
      args = {
        input: {
          teamId: requestParser(req, ['teamId', 'team_id']),
          projectId: requestParser(req, ['projectId', 'project_id']),
          formId: requestParser(req, ['formId', 'form_id'])
        }
      }
    }

    const user = req.user
    const scope = this.reflector.get<PermissionScopeEnum>('scope', context.getHandler())

    let { teamId, projectId } = args.input

    if (scope >= PermissionScopeEnum.form) {
      const formId = args.input.formId
      const form = await this.formService.findById(formId)

      if (!form) {
        throw new BadRequestException('Please make sure you have permission to access this form')
      }

      req.form = {
        id: formId,
        ...form.toObject()
      }

      teamId = form.teamId
      projectId = form.projectId
    }

    if (scope >= PermissionScopeEnum.project) {
      const [project, projectMember] = await Promise.all([
        this.projectService.findById(projectId),
        this.projectService.findMemberById(projectId, user.id)
      ])

      if (!project) {
        throw new BadRequestException('Please make sure you have permission to access this project')
      }

      if (!projectMember) {
        throw new BadRequestException("You don't have permission to access the workspace")
      }

      req.project = {
        id: projectId,
        ...project.toObject(),
        isOwner: project.ownerId === user.id
      }

      teamId = project.teamId
    }

    const [team, teamMember] = await Promise.all([
      this.teamService.findById(teamId),
      this.teamService.findMemberById(teamId, user.id)
    ])

    if (!team) {
      throw new BadRequestException("You don't have permission to access the workspace")
    }

    if (!teamMember) {
      throw new BadRequestException("You don't have permission to access the workspace")
    }

    const isOwner = team.ownerId === user.id

    const requiredRoles = this.reflector.get<TeamRoleEnum[]>(ROLES_KEY, context.getHandler())

    if (requiredRoles && requiredRoles.length > 0) {
      if (!isOwner && !requiredRoles.includes(teamMember.role)) {
        throw new ForbiddenException("You don't have permission for this operation")
      }
    }

    const requiredPermission = this.reflector.get<PermissionKey>(
      PERMISSION_KEY,
      context.getHandler()
    )

    if (requiredPermission) {
      if (!isOwner) {
        const matrix =
          (team.permissionMatrix as Record<string, number[]>) || DEFAULT_PERMISSION_MATRIX
        const allowedRoles =
          matrix[requiredPermission] || DEFAULT_PERMISSION_MATRIX[requiredPermission] || []

        if (!allowedRoles.includes(teamMember.role)) {
          throw new ForbiddenException({
            statusCode: 403,
            message: "You don't have permission for this operation",
            permissionKey: requiredPermission
          })
        }
      }
    }

    req.team = {
      id: teamId,
      ownerId: team.ownerId,
      isOwner,
      name: team.name,
      role: teamMember.role,
      storageQuota: team.storageQuota,
      inviteCode: team.inviteCode,
      permissionMatrix: team.permissionMatrix
    }

    this.teamService
      .updateMember(teamId, user.id, {
        lastSeenAt: timestamp()
      })
      .catch(() => {
        // lastSeenAt is not critical for authorization
      })

    return true
  }
}
