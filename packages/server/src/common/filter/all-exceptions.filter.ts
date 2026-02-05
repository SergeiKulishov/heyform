import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException
} from '@nestjs/common'

import { GqlExecutionContext } from '@nestjs/graphql'
import { Logger } from '@utils'
import { helper } from '@voxly/utils'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: Error, host: ArgumentsHost): void {
    const gqlCtx = GqlExecutionContext.create(host as any)
    const ctx = gqlCtx.getContext()

    if (helper.isValid(ctx.res)) {
      if (!(exception instanceof HttpException)) {
        this.logger.error(exception, exception.stack)

        throw new InternalServerErrorException(exception.message)
      }
    } else {
      const res = host.switchToHttp().getResponse()

      let httpException = exception as HttpException

      if (!(exception instanceof HttpException)) {
        httpException = new InternalServerErrorException(exception.message)

        this.logger.error(exception, exception.stack)
      }

      if (res.get('content-type') === 'text/event-stream') {
        const response = httpException.getResponse()
        let message = response as string

        if (helper.isObject(response)) {
          message = (response as any).message[0]
        }

        res.sse(`data: [ERROR] ${message}\n\n`)
        return res.end()
      }

      res.status(httpException.getStatus()).json(httpException.getResponse())
    }
  }
}
