import axios from 'axios'

export class ShortenUrlService {
  static async shorten(url: string, formId?: string, teamId?: string): Promise<string> {
    const result = await axios.post<{ link: string }>('/api/shorten-url', {
      url,
      formId,
      teamId
    })
    return result.data.link
  }
}
