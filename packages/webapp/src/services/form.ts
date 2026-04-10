import {
  FormField,
  FormKindEnum,
  FormStatusEnum,
  FormTheme,
  HiddenField,
  HiddenFieldAnswer,
  InteractiveModeEnum,
  Logic,
  Variable
} from '@voxly/shared-types-enums'

import { apollo } from '@/utils'

import {
  AUDIT_FORM_WITH_AI_GQL,
  COMPLETE_SUBMISSION_GQL,
  CREATE_FIELDS_WITH_AI_GQL,
  CREATE_FORM_FIELD_GQL,
  CREATE_FORM_GQL,
  CREATE_FORM_LOGICS_WITH_AI_GQL,
  CREATE_FORM_THEME_WITH_AI_GQL,
  CREATE_FORM_WITH_AI_GQL,
  DELETE_FORM_FIELD_GQL,
  DELETE_FORM_GQL,
  DELETE_FORM_LINK_GQL,
  DELETE_TEAM_TEMPLATE_GQL,
  DUPLICATE_FORM_GQL,
  FORMS_GQL,
  FORM_ANALYTIC_GQL,
  FORM_DETAIL_GQL,
  FORM_INTEGRATIONS_GQL,
  FORM_LINKS_GQL,
  FORM_LINK_STATS_GQL,
  FORM_REPORT_GQL,
  FORM_SUMMARY_GQL,
  FUNNEL_ANALYTICS_GQL,
  IMPORT_FORM_GQL,
  MOVE_FORM_TO_PROJECT_GQL,
  MOVE_FORM_TO_TRASH_GQL,
  OPEN_FORM_GQL,
  PUBLIC_FORM_GQL,
  PUBLISH_FORM_SQL,
  RESTORE_FORM_GQL,
  SAVE_AS_TEMPLATE_GQL,
  SEARCH_FORM_GQL,
  TEAM_TEMPLATES_GQL,
  TEMPLATES_GQL,
  TEMPLATE_DETAILS_GQL,
  UPDATE_FORM_ARCHIVE_GQL,
  UPDATE_FORM_FIELD_GQL,
  UPDATE_FORM_GQL,
  UPDATE_FORM_HIDDEN_FIELDS_GQL,
  UPDATE_FORM_INTEGRATIONS_GQL,
  UPDATE_FORM_LOGICS_GQL,
  UPDATE_FORM_SCHEMAS_GQL,
  UPDATE_FORM_THEME_GQL,
  UPDATE_FORM_VARIABLES_GQL,
  USE_TEMPLATE_GQL,
  VERIFY_FORM_PASSWORD_GQL
} from '@/consts'
import { TemplateType } from '@/types'

export class FormService {
  static async forms(projectId: string, status = FormStatusEnum.NORMAL) {
    return apollo.query({
      query: FORMS_GQL,
      variables: {
        input: {
          projectId,
          status
        }
      },
      fetchPolicy: 'network-only'
    })
  }

  static async completeSubmission(input: {
    formId: string
    openToken?: string
    passwordToken?: string
    answers: Record<string, any>
    hiddenFields: HiddenFieldAnswer[]

    recaptchaToken?: string

    geetestChallenge?: string
    geetestValidate?: string
    geetestSeccode?: string
    partialSubmission?: boolean
  }) {
    return apollo.mutate({
      mutation: COMPLETE_SUBMISSION_GQL,
      variables: {
        input
      }
    })
  }

  static create(input: {
    projectId: string
    name: string
    nameSchema?: string[]
    interactiveMode: InteractiveModeEnum
    kind: FormKindEnum
    folderId?: string
  }) {
    return apollo.mutate({
      mutation: CREATE_FORM_GQL,
      variables: {
        input
      }
    })
  }

  static createWithAI(input: { projectId: string; topic: string; reference?: string }) {
    return apollo.mutate({
      mutation: CREATE_FORM_WITH_AI_GQL,
      variables: {
        input
      }
    })
  }

  static createFieldsWithAI(
    formId: string,
    prompt: string,
    history?: Array<{ role: string; content: string }>
  ) {
    return apollo.mutate({
      mutation: CREATE_FIELDS_WITH_AI_GQL,
      variables: {
        input: {
          formId,
          prompt,
          history
        }
      }
    })
  }

  static auditFormWithAI(formId: string) {
    return apollo.mutate({
      mutation: AUDIT_FORM_WITH_AI_GQL,
      variables: { input: { formId } }
    })
  }

  static createLogicsWithAI(formId: string, prompt: string) {
    return apollo.mutate({
      mutation: CREATE_FORM_LOGICS_WITH_AI_GQL,
      variables: {
        input: {
          formId,
          prompt
        }
      }
    })
  }

  static createThemesWithAI(formId: string, prompt: string, theme: string) {
    return apollo.mutate({
      mutation: CREATE_FORM_THEME_WITH_AI_GQL,
      variables: {
        input: {
          formId,
          prompt,
          theme
        }
      }
    })
  }

  static import(projectId: string, url: string) {
    return apollo.mutate({
      mutation: IMPORT_FORM_GQL,
      variables: {
        input: {
          projectId,
          url
        }
      }
    })
  }

  static async importFromJSON(projectId: string, formJson: string) {
    try {
      // Парсим JSON
      const formData = JSON.parse(formJson)

      // Валидация: проверяем обязательные поля
      if (!formData.name) {
        throw new Error('Form name is required in JSON')
      }

      if (!formData.fields || !Array.isArray(formData.fields)) {
        throw new Error('Form fields are required in JSON')
      }

      // Шаг 1: Создаем форму
      const formId = await this.create({
        projectId,
        name: formData.name,
        nameSchema: formData.nameSchema || [],
        interactiveMode: formData.interactiveMode || InteractiveModeEnum.GENERAL,
        kind: formData.kind || FormKindEnum.SURVEY
      })

      // Шаг 2: Импортируем поля формы
      if (formData.fields && formData.fields.length > 0) {
        await this.updateFormSchemas({
          formId,
          drafts: formData.fields,
          version: 0
        })
      }

      // Шаг 3: Импортируем настройки темы (если есть)
      if (formData.themeSettings) {
        await this.updateTheme({
          formId,
          theme: formData.themeSettings.theme || {},
          logo: formData.themeSettings.logo
        })
      }

      // Шаг 4: Импортируем скрытые поля (если есть)
      if (formData.hiddenFields && formData.hiddenFields.length > 0) {
        await this.updateHiddenFields(formId, formData.hiddenFields)
      }

      // Шаг 5: Импортируем логику (если есть)
      if (formData.logics && formData.logics.length > 0) {
        await this.updateLogics(formId, formData.logics)
      }

      // Шаг 6: Импортируем переменные (если есть)
      if (formData.variables && formData.variables.length > 0) {
        await this.updateVariables(formId, formData.variables)
      }

      return formId
    } catch (error) {
      // Улучшенная обработка ошибок
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format: ' + error.message)
      }
      throw error
    }
  }

  static async analytic(formId: string, range: string) {
    return apollo.query({
      query: FORM_ANALYTIC_GQL,
      variables: {
        input: {
          formId,
          range
        }
      },
      fetchPolicy: 'cache-first'
    })
  }

  static async funnelAnalytics(formId: string, range: string) {
    return apollo.query({
      query: FUNNEL_ANALYTICS_GQL,
      variables: {
        input: {
          formId,
          range
        }
      },
      fetchPolicy: 'network-only'
    })
  }

  static async report(formId: string) {
    return apollo.query({
      query: FORM_REPORT_GQL,
      variables: {
        input: {
          formId
        }
      },
      fetchPolicy: 'cache-first'
    })
  }

  static async summary(formId: string) {
    return apollo.query({
      query: FORM_SUMMARY_GQL,
      variables: {
        input: {
          formId
        }
      },
      fetchPolicy: 'network-only'
    })
  }

  static async detail(formId: string) {
    return apollo.query({
      query: FORM_DETAIL_GQL,
      variables: {
        input: {
          formId
        }
      },
      fetchPolicy: 'network-only'
    })
  }

  static async openForm(formId: string) {
    return apollo.query({
      query: OPEN_FORM_GQL,
      variables: {
        input: {
          formId
        }
      }
    })
  }

  static updateFormSchemas(input: { formId: string; drafts: AnyMap[]; version: number }) {
    return apollo.mutate({
      mutation: UPDATE_FORM_SCHEMAS_GQL,
      variables: {
        input
      }
    })
  }

  static publishForm(input: { formId: string; drafts: AnyMap[]; version: number }) {
    return apollo.mutate({
      mutation: PUBLISH_FORM_SQL,
      variables: {
        input
      }
    })
  }

  static updateLogics(formId: string, logics: Logic[]) {
    return apollo.mutate({
      mutation: UPDATE_FORM_LOGICS_GQL,
      variables: {
        input: {
          formId,
          logics
        }
      }
    })
  }

  static updateVariables(formId: string, variables: Variable[]) {
    return apollo.mutate({
      mutation: UPDATE_FORM_VARIABLES_GQL,
      variables: {
        input: {
          formId,
          variables
        }
      }
    })
  }

  static updateHiddenFields(formId: string, hiddenFields: HiddenField[]) {
    return apollo.mutate({
      mutation: UPDATE_FORM_HIDDEN_FIELDS_GQL,
      variables: {
        input: {
          formId,
          hiddenFields
        }
      }
    })
  }

  static update(formId: string, updates: AnyMap) {
    return apollo.mutate({
      mutation: UPDATE_FORM_GQL,
      variables: {
        input: {
          formId,
          ...updates
        }
      }
    })
  }

  static updateArchive(formId: string, allowArchive: boolean) {
    return apollo.mutate({
      mutation: UPDATE_FORM_ARCHIVE_GQL,
      variables: {
        input: {
          formId,
          allowArchive
        }
      }
    })
  }

  static updateTheme(input: { formId: string; theme: FormTheme; logo?: string }) {
    return apollo.mutate({
      mutation: UPDATE_FORM_THEME_GQL,
      variables: {
        input
      }
    })
  }

  static createField(formId: string, field: Partial<FormField>) {
    return apollo.mutate({
      mutation: CREATE_FORM_FIELD_GQL,
      variables: {
        input: {
          formId,
          field
        }
      }
    })
  }

  static updateField(input: { formId: string; fieldId: string; updates: Partial<FormField> }) {
    return apollo.mutate({
      mutation: UPDATE_FORM_FIELD_GQL,
      variables: {
        input
      }
    })
  }

  static deleteField(formId: string, fieldId: string) {
    return apollo.mutate({
      mutation: DELETE_FORM_FIELD_GQL,
      variables: {
        input: {
          formId,
          fieldId
        }
      }
    })
  }

  static async integrations(formId: string) {
    return apollo.query({
      query: FORM_INTEGRATIONS_GQL,
      fetchPolicy: 'no-cache',
      variables: {
        input: {
          formId
        }
      }
    })
  }

  static updateIntegration(input: { formId: string; appId: string; attributes: AnyMap }) {
    return apollo.mutate({
      mutation: UPDATE_FORM_INTEGRATIONS_GQL,
      variables: {
        input
      }
    })
  }

  static duplicate(formId: string, name: string) {
    return apollo.mutate({
      mutation: DUPLICATE_FORM_GQL,
      variables: {
        input: {
          formId,
          name
        }
      }
    })
  }

  static search(keyword: string) {
    return apollo.query({
      query: SEARCH_FORM_GQL,
      variables: {
        input: {
          keyword
        }
      }
    })
  }

  static moveToTrash(formId: string) {
    return apollo.mutate({
      mutation: MOVE_FORM_TO_TRASH_GQL,
      variables: {
        input: {
          formId
        }
      }
    })
  }

  static restoreForm(formId: string) {
    return apollo.mutate({
      mutation: RESTORE_FORM_GQL,
      variables: {
        input: {
          formId
        }
      }
    })
  }

  static moveToProject(formId: string, targetProjectId: string) {
    return apollo.mutate({
      mutation: MOVE_FORM_TO_PROJECT_GQL,
      variables: {
        input: {
          formId,
          targetProjectId
        }
      }
    })
  }

  static delete(formId: string) {
    return apollo.mutate({
      mutation: DELETE_FORM_GQL,
      variables: {
        input: {
          formId
        }
      }
    })
  }

  static templates(): Promise<TemplateType[]> {
    return apollo.query({
      query: TEMPLATES_GQL,
      fetchPolicy: 'cache-first',
      variables: {
        input: {
          limit: 0
        }
      }
    })
  }

  static templateDetail(templateId: string) {
    return apollo.query({
      query: TEMPLATE_DETAILS_GQL,
      variables: {
        input: {
          templateId
        }
      }
    })
  }

  static useTemplate(input: { projectId: string; templateId: string; recordId: string }) {
    return apollo.mutate({
      mutation: USE_TEMPLATE_GQL,
      variables: {
        input
      }
    })
  }

  static saveAsTemplate(input: {
    formId: string
    name: string
    category: string
    description?: string
  }) {
    return apollo.mutate({
      mutation: SAVE_AS_TEMPLATE_GQL,
      variables: {
        input
      }
    })
  }

  static teamTemplates(teamId: string, keyword?: string): Promise<TemplateType[]> {
    return apollo.query({
      query: TEAM_TEMPLATES_GQL,
      fetchPolicy: 'network-only',
      variables: {
        input: {
          teamId,
          keyword
        }
      }
    })
  }

  static deleteTeamTemplate(templateId: string, teamId: string) {
    return apollo.mutate({
      mutation: DELETE_TEAM_TEMPLATE_GQL,
      variables: {
        input: {
          templateId,
          teamId
        }
      }
    })
  }

  static async publicForm(formId: string) {
    return apollo.query({
      query: PUBLIC_FORM_GQL,
      variables: {
        input: {
          formId
        }
      },
      fetchPolicy: 'network-only'
    })
  }

  static async verifyFormPassword(formId: string, password: string) {
    return apollo.query({
      query: VERIFY_FORM_PASSWORD_GQL,
      variables: {
        input: {
          formId,
          password
        }
      }
    })
  }

  static async formLinks(formId: string) {
    return apollo.query({
      query: FORM_LINKS_GQL,
      variables: {
        input: { formId }
      },
      fetchPolicy: 'network-only'
    })
  }

  static async deleteFormLink(id: string, formId: string) {
    return apollo.mutate({
      mutation: DELETE_FORM_LINK_GQL,
      variables: {
        input: { id, formId }
      }
    })
  }

  static async formLinkStats(id: string, formId: string) {
    return apollo.query({
      query: FORM_LINK_STATS_GQL,
      variables: {
        input: { id, formId }
      },
      fetchPolicy: 'network-only'
    })
  }
}
