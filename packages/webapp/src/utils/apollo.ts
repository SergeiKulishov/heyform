import {
  ApolloClient,
  ApolloQueryResult,
  HttpLink,
  InMemoryCache,
  MutationOptions,
  QueryOptions,
  from
} from '@apollo/client'
import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { RetryLink } from 'apollo-link-retry'
import ApolloLinkTimeout from 'apollo-link-timeout'

import { helper } from '@voxly/utils'

import { GRAPHQL_API_URL, IS_PROD } from '@/consts'

import { clearAuthState, getDeviceId } from './auth'

if (!IS_PROD) {
  loadDevMessages()
  loadErrorMessages()
}

const httpLink = new HttpLink({
  uri: GRAPHQL_API_URL,
  credentials: 'include'
})

const retryLink: any = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true
  },
  attempts: {
    max: 3
  }
})

const timeoutLink = new ApolloLinkTimeout(30_000)

const headerLink = setContext((_, { headers }) => {
  const deviceId = getDeviceId()
  return {
    headers: {
      ...headers,
      'X-Device-Id': deviceId,
      'x-anonymous-id': deviceId
    }
  }
})

const errorLink = onError(({ response }) => {
  if (helper.isValid(response?.errors)) {
    const error: any = response!.errors![0]

    if (!helper.isValid(error)) {
      return
    }

    const statusCode =
      error.extensions?.response?.statusCode ||
      error.extensions?.originalError?.statusCode ||
      error.status

    if (statusCode === 401) {
      clearAuthState()
      window.location.href = '/logout'
      return
    }

    if (statusCode === 403) {
      const permissionKey =
        error.extensions?.response?.permissionKey ||
        error.extensions?.originalError?.permissionKey ||
        null

      window.dispatchEvent(
        new CustomEvent('permission-denied', {
          detail: { permissionKey }
        })
      )
    }
  }
})

const cache = new InMemoryCache({
  addTypename: false
})

window.__APOLLO_DEVTOOLS_GLOBAL_HOOK__ = true

const client = new ApolloClient({
  link: from([retryLink, timeoutLink, headerLink, errorLink, httpLink]),
  connectToDevTools: false,
  cache
})

function responseInterceptor<T = Any>(response: ApolloQueryResult<T>): T {
  const operationName = Object.keys(response)[0]

  return JSON.parse(JSON.stringify((response as Any)[operationName]))
}

export const apollo = {
  async mutate<T = Any>(options: MutationOptions): Promise<T> {
    const result = await client.mutate(options)

    return responseInterceptor<T>(result.data)
  },

  async query<T = Any>(options: QueryOptions): Promise<T> {
    const result = await client.query(options)

    return responseInterceptor<T>(result.data)
  }
}
