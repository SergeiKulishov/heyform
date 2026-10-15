import { Controller, Delete, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express'

import { McpAuthGuard } from '@guard'
import { McpService } from '@service'

@Controller()
@UseGuards(McpAuthGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post('/api/mcp')
  @HttpCode(200)
  async handlePost(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.mcpService.handlePost(req, res)
  }

  @Get('/api/mcp')
  handleGet(@Res() res: Response): void {
    res.set('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
  }

  @Delete('/api/mcp')
  handleDelete(@Res() res: Response): void {
    res.set('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
  }
}
