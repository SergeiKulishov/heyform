import { apollo } from '@/utils'

import { API_TOKENS_GQL, CREATE_API_TOKEN_GQL, REVOKE_API_TOKEN_GQL } from '@/consts'

export interface ApiTokenType {
  id: string
  name: string
  prefix: string
  scope: string
  lastUsedAt?: string
  createdAt: string
}

export interface CreateApiTokenType extends ApiTokenType {
  token: string
}

export class ApiTokenService {
  static async apiTokens(teamId: string) {
    return apollo.query<ApiTokenType[]>({
      query: API_TOKENS_GQL,
      variables: {
        input: {
          teamId
        }
      },
      fetchPolicy: 'network-only'
    })
  }

  static async create(teamId: string, name: string, scope: string) {
    return apollo.mutate<CreateApiTokenType>({
      mutation: CREATE_API_TOKEN_GQL,
      variables: {
        input: {
          teamId,
          name,
          scope
        }
      }
    })
  }

  static async revoke(teamId: string, tokenId: string) {
    return apollo.mutate<boolean>({
      mutation: REVOKE_API_TOKEN_GQL,
      variables: {
        input: {
          teamId,
          tokenId
        }
      }
    })
  }
}
