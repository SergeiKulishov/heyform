import { BadRequestException, Body, Controller, Post } from '@nestjs/common'
import axios from 'axios'

import { Auth } from '@decorator'

interface ShortenUrlDto {
  url: string
}

@Controller()
@Auth()
export class ShortenUrlController {
  @Post('/api/shorten-url')
  async shortenUrl(@Body() input: ShortenUrlDto): Promise<{ link: string }> {
    if (!input.url) {
      throw new BadRequestException('URL is required')
    }

    input.url = 'https://heyform-i48woow4c00wsccsggksg8gw.stackbro.tech/form/RfKa5iRb?name=Sauron'
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

      return { link: response.data.link }
    } catch (error: any) {
      console.error('Failed to shorten URL:', error.response?.data || error.message)
      throw new BadRequestException(error.response?.data?.error || 'Failed to shorten URL')
    }
  }
}
