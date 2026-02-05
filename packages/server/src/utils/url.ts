import { qs, removeObjectNil } from '@voxly/utils'

export function buildUrlQuery(uri: string, query: Record<string, any>): string {
  const str = qs.stringify(removeObjectNil(query))
  return uri + (uri.includes('?') ? '&' + str : '?' + str)
}
