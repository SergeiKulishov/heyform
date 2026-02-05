import { ExecutionContext, createParamDecorator } from '@nestjs/common'
import 'reflect-metadata'

import { GqlExecutionContext } from '@nestjs/graphql'
import { helper } from '@voxly/utils'

export function ip(req: any, headerName = 'x-forwarded-for'): string {
  const val = req.get(headerName)

  if (helper.isValid(val)) {
    const ips = val.split(/\s*,\s*/)

    if (helper.isValidArray(ips)) {
      return ips[0]
    }
  }

  return req.ip
}

export const GqlIP = createParamDecorator((_: any, context: ExecutionContext): string => {
  const ctx = GqlExecutionContext.create(context)
  const { req } = ctx.getContext()
  return ip(req)
})

export const HttpIP = createParamDecorator((_: any, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest()
  return ip(req)
})
