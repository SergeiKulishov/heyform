import type {
  FormField,
  FormSettings,
  FormTheme,
  HiddenField,
  Logic,
  Variable
} from '@heyform-inc/shared-types-enums'
import { QUESTION_FIELD_KINDS } from '@heyform-inc/shared-types-enums'
import { useContext } from 'react'
import store2 from 'store2'

import {
  LRU,
  createStoreContext,
  createStoreReducer,
  isFile,
  progressPercentage,
  replaceHTML,
  validateLogicField
} from './utils'
import { applyLogicToFields } from '@heyform-inc/answer-utils'
import { helper } from '@heyform-inc/utils'

import type { AnyMap, IFormField } from './typings'

let LRU_CACHE: LRU

export function getLRU(): LRU {
  if (!LRU_CACHE) {
    LRU_CACHE = new LRU({
      bucket: 'HEYFORM_DATA',
      store: {
        getItem: store2.get.bind(store2),
        setItem: store2.set.bind(store2),
        removeItem: store2.remove.bind(store2)
      }
    })
  }
  return LRU_CACHE
}

export interface StoredFormData {
  sessionId?: string
  values: AnyMap
  scrollIndex?: number
}

export function getStorage(formId: string, enabled?: boolean): StoredFormData | null {
  if (!enabled) return null

  const cache = getLRU().get<StoredFormData>(formId)
  if (!cache || !helper.isValid(cache)) return null

  return cache
}

export function saveStorage(formId: string, data: StoredFormData): void {
  getLRU().put(formId, data)
}

export function removeStorage(formId: string) {
  getLRU().remove(formId)
}

export type ScrollDestination = 'next' | 'previous' | string

export interface IStripe {
  elements: stripe.elements.Elements
  confirmCardPayment: (
    clientSecret: string,
    data?: stripe.ConfirmCardPaymentData,
    options?: stripe.ConfirmCardPaymentOptions
  ) => Promise<stripe.PaymentIntentResponse>
  apiKey: string
  accountId: string
}

export interface IState {
  formId: string
  instanceId: string
  sessionId: string
  welcomeField?: IFormField
  thankYouFieldId?: string
  thankYouFields: IFormField[]
  allFields: IFormField[]
  fields: IFormField[]
  hiddenFields: HiddenField[]
  translations?: Record<string, any>
  query: Record<string, any>
  jumpFieldIds: string[]
  logics?: Logic[]
  parameters?: Variable[]
  variables: AnyMap
  values: AnyMap
  autoSave?: boolean
  settings?: FormSettings
  percentage: number
  questionCount: number
  scrollIndex?: number
  scrollTo?: ScrollDestination
  isScrollNextDisabled?: boolean
  errorFieldId?: string
  isSubmitTouched?: boolean
  isStarted?: boolean
  isSubmitting?: boolean
  isSubmitted?: boolean
  isSidebarOpen?: boolean
  reportAbuseURL?: string
  locale: string
  customUrlRedirects?: boolean
  alwaysShowNextButton?: boolean
  enableQuestionList?: boolean
  enableNavigationArrows?: boolean
  logo?: string
  theme: FormTheme
  stripe?: IStripe
  onSubmit?: (
    values: Record<string, any>,
    isPartial?: boolean,
    stripe?: IStripe,
    meta?: { sessionId: string; lastFieldId?: string; lastFieldIndex?: number }
  ) => Promise<void>
}

const actions: any = {
  setValues: (state: IState, { values }: any) => {
    const newValues = {
      ...state.values,
      ...values
    }

    // Save to localStorage if partial submission is enabled (default: true)
    if (state.settings?.enablePartialSubmission !== false) {
      const filteredValues: AnyMap = {}

      Object.keys(newValues).forEach(key => {
        const value = newValues[key]

        if (helper.isValid(value) && !isFile(value)) {
          filteredValues[key] = value
        }
      })

      saveStorage(state.formId, {
        sessionId: state.sessionId,
        values: filteredValues,
        scrollIndex: state.scrollIndex || 0
      })
    }

    const { fields, variables } = applyLogicToFields(
      [...state.allFields, ...state.thankYouFields].filter(Boolean) as FormField[],
      state.logics,
      state.parameters,
      newValues
    )

    const questionCount = fields.filter(f => QUESTION_FIELD_KINDS.includes(f.kind)).length
    const percentage = progressPercentage(Object.keys(newValues).length, questionCount)

    const isTouched = validateLogicField(fields[state.scrollIndex!], state.jumpFieldIds, values)
    const isScrollNextDisabled = !isTouched || state.scrollIndex! >= fields.length - 1

    return {
      ...state,
      fields,
      values: newValues,
      variables,
      percentage,
      questionCount,
      isScrollNextDisabled
    }
  },

  setIsStarted: (state: IState, { isStarted }: any) => {
    return actions.scrollTo(
      {
        ...state,
        isStarted,
        isSubmitted: state.fields.length < 1
      },
      {
        scrollIndex: 0,
        scrollTo: 'next'
      }
    )
  },

  setIsSubmitTouched: (state: IState, { isSubmitTouched }: any) => ({ ...state, isSubmitTouched }),

  setIsSubmitting: (state: IState, { isSubmitting }: any) => ({ ...state, isSubmitting }),

  setIsSubmitted: (state: IState, { isSubmitted, thankYouFieldId }: any) => {
    // Clear localStorage on successful submission
    if (isSubmitted) {
      removeStorage(state.formId)
    }
    return {
      ...state,
      isSubmitted,
      isSidebarOpen: false,
      thankYouFieldId
    }
  },

  setIsSidebarOpen: (state: IState, { isSidebarOpen }: any) => ({ ...state, isSidebarOpen }),

  setStripe: (state: IState, { stripe }: any) => ({ ...state, stripe }),

  resetErrorField: (state: IState) => ({ ...state, errorFieldId: undefined }),

  scrollPrevious: (state: IState) => {
    if (state.scrollIndex! < 1) {
      return state
    }

    return actions.scrollTo(state, {
      scrollIndex: state.scrollIndex! - 1,
      scrollTo: 'previous'
    })
  },

  scrollNext: (state: IState) => {
    const { scrollIndex, fields, values, jumpFieldIds } = state
    const isTouched = validateLogicField(fields[scrollIndex!], jumpFieldIds, values)

    if (!isTouched || scrollIndex! >= fields.length - 1) {
      return {
        ...state,
        isScrollNextDisabled: true
      }
    }

    return actions.scrollTo(state, {
      scrollIndex: scrollIndex! + 1,
      scrollTo: 'next'
    })
  },

  scrollToField(state: IState, { fieldId, errorFieldId }: any) {
    const index = state.fields.findIndex(f => f.id === fieldId)

    if (index < 0) {
      return state
    }

    return actions.scrollTo(state, {
      scrollIndex: index,
      scrollTo:
        !helper.isNil(state.scrollIndex) && index >= state.scrollIndex! ? 'next' : 'previous',
      errorFieldId
    })
  },

  scrollTo(state: IState, { scrollIndex, scrollTo, errorFieldId }: any) {
    const { fields, values, variables } = state
    const field = fields[scrollIndex]

    field.title = replaceHTML(field.title as string, values, fields, state.query, variables)
    field.description = replaceHTML(
      field.description as string,
      values,
      fields,
      state.query,
      variables
    )

    return {
      ...state,
      fields,
      scrollIndex,
      scrollTo,
      isScrollNextDisabled: false,
      errorFieldId
    }
  }
}

export const StoreContext = createStoreContext<IState>({
  instanceId: '',
  formId: '',
  sessionId: '',
  allFields: [],
  fields: [],
  thankYouFields: [],
  hiddenFields: [],
  query: {},
  jumpFieldIds: [],
  values: {},
  variables: {},
  percentage: 0,
  questionCount: 0,
  locale: 'en',
  theme: {}
})

export const StoreReducer = createStoreReducer<IState>(actions, (_, newState) => newState)

export function useStore() {
  return useContext(StoreContext)
}
