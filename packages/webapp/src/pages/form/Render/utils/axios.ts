import axiosStatic, { AxiosInstance, AxiosRequestConfig } from 'axios'
import cookies from 'js-cookie'
import store2 from 'store2'

import { helper, nanoid } from '@voxly/utils'

import { HEYFORM_ID_KEY } from '../consts'

let instance: AxiosInstance

function getInstance() {
  if (!instance) {
    instance = axiosStatic.create({
      timeout: 30_000
    })

    instance.interceptors.response.use(
      function (response) {
        if (helper.isValidArray(response.data?.errors)) {
          return Promise.reject(new Error(response.data!.errors[0].message))
        }
        return response.data.data
      },
      function (error) {
        return Promise.reject(error)
      }
    )
  }
  return instance
}

function getAnonymousId(): string {
  let id = cookies.get(HEYFORM_ID_KEY) || store2.get(HEYFORM_ID_KEY)

  if (helper.isEmpty(id)) {
    id = nanoid(8)

    // save to cookie and localStorage
    cookies.set(HEYFORM_ID_KEY, id)
    store2.set(HEYFORM_ID_KEY, id)
  }

  return id!
}

export function axios(data: Record<string, Any> | FormData): Promise<Any> {
  const config: AxiosRequestConfig = {
    method: 'POST',
    url: '/graphql',
    headers: {
      'X-Anonymous-ID': getAnonymousId()
    },
    data
  }

  if (!helper.isFormData(data)) {
    config.headers = {
      ...config.headers,
      'Content-Type': 'application/json'
    }
  }

  return getInstance()(config)
}
