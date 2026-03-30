import { BadRequestException, Body, Controller, Post } from '@nestjs/common'
import axios from 'axios'

import { Auth, User as UserDecorator } from '@decorator'
import { UserModel } from '@model'
import { FormLinkService } from '@service'

interface ShortenUrlDto {
  url: string
  formId?: string
  teamId?: string
}

@Controller()
@Auth()
export class ShortenUrlController {
  constructor(private readonly formLinkService: FormLinkService) {}

  @Post('/api/shorten-url')
  async shortenUrl(
    @UserDecorator() _user: UserModel,
    @Body() input: ShortenUrlDto
  ): Promise<{ link: string; id?: string }> {
    if (!input.url) {
      throw new BadRequestException('URL is required')
    }

    const KUTT_API_URL =
      process.env.KUTT_API_URL || 'https://kutt-swww4os08c08g8wkskk0sgwo.stackbro.tech/api/v2'
    const KUTT_API_KEY = process.env.KUTT_API_KEY || ''

    if (!KUTT_API_KEY) {
      throw new BadRequestException('Kutt API key is not configured')
    }

    try {
      const response = await axios.post(
        `${KUTT_API_URL}/links`,
        { target: input.url },
        {
          headers: {
            'X-API-Key': KUTT_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      )

      const { link, id: kuttId } = response.data

      if (input.formId && input.teamId && kuttId) {
        const saved = await this.formLinkService.create({
          formId: input.formId,
          teamId: input.teamId,
          kuttId,
          shortLink: link,
          target: input.url,
          source: 'manual'
        })
        return { link, id: saved.id }
      }

      return { link }
    } catch (error: any) {
      console.error('Failed to shorten URL:', error.response?.data || error.message)
      throw new BadRequestException(error.response?.data?.error || 'Failed to shorten URL')
    }
  }
}
