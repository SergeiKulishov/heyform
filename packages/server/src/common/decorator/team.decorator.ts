import { ExecutionContext, createParamDecorator } from '@nestjs/common'

import { UserModel } from '@model'
import { GqlExecutionContext } from '@nestjs/graphql'
import { helper } from '@voxly/utils'

export const Team = createParamDecorator((_: any, context: ExecutionContext): UserModel => {
  const ctx = GqlExecutionContext.create(context)
  let { req } = ctx.getContext()

  if (helper.isEmpty(req)) {
    req = context.switchToHttp().getRequest()
  }

  return req.team
})
