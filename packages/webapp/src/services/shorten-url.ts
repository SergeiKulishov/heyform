import axios from 'axios'

export class ShortenUrlService {
  static async shorten(url: string): Promise<string> {
    const result = await axios.post<{ link: string }>('/api/shorten-url', { url })
    return result.data.link
  }
}
