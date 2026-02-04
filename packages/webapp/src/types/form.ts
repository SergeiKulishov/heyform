import { FormField, FormModel, Property } from '@heyform-inc/shared-types-enums'

import { APP_STATUS_ENUM } from '@/consts'

export interface AppSettingType {
  type: string
  name: string
  label: string
  description?: string
  placeholder?: string
  required: boolean
}

export interface AppType {
  id: string
  name: string
  description?: string
  icon?: string
  settings?: AppSettingType[]
  status?: APP_STATUS_ENUM
}

export interface IntegratedAppType extends AppType {
  integration: IntegrationType
  isAuthorized?: boolean
}

export interface IntegrationType {
  appId: string
  config?: AnyMap
  status: number
}

export interface FormFieldType extends FormField {
  isCollapsed?: boolean
  parent?: FormFieldType
  properties?: Omit<Property, 'fields'> & {
    fields?: FormField[]
  }
}

export interface TemplateType extends FormModel {
  category: string
  recordId?: string
  description?: string
}

export interface TemplateGroupType {
  id: string
  category: string
  templates: TemplateType[]
}

export interface ChatMessageType {
  id: string
  type: 'text' | 'notification'
  content: string
  isUser?: boolean
}
