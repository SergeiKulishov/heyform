import { BadRequestException, Injectable } from '@nestjs/common'
import {
  ActionEnum,
  CHOICES_FIELD_KINDS,
  ComparisonEnum,
  FieldKindEnum,
  FormField,
  FormStatusEnum,
  OTHER_ITEM_ID,
  SubmissionCategoryEnum,
  SubmissionStatusEnum
} from '@voxly/shared-types-enums'
import { Request, Response } from 'express'
import { z } from 'zod'

import { ApiTokenModel, TeamModel } from '@model'
import { FormReportService, FormService, ProjectService, SubmissionService } from '@service'
import { parseUserAgent } from '@utils'
import { applyLogicToFields, fieldValuesToAnswers, flattenFields } from '@voxly/answer-utils'
import { nanoid, timestamp } from '@voxly/utils'

interface McpRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, any>
}

interface McpToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, any>
  handler: (args: Record<string, any>, context: ToolContext) => Promise<Record<string, any>>
}

interface ToolContext {
  teamId: string
  userId: string
  tokenScope: string
}

interface ToolCallResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

const listFormsSchema = z.object({})

const listProjectsSchema = z.object({})

const getFormSchemaSchema = z.object({
  formId: z.string(),
  source: z.enum(['published', 'drafts']).optional()
})

const getFormReportSchema = z.object({
  formId: z.string()
})

const listSubmissionsSchema = z.object({
  formId: z.string(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  isCompleted: z.boolean().optional()
})

const getSubmissionsSummarySchema = z.object({
  formId: z.string()
})

const fieldInputSchema = z.object({
  id: z.string().optional(),
  kind: z.string(),
  title: z.any().optional(),
  description: z.any().optional(),
  properties: z.any().optional(),
  validations: z.any().optional()
})

const logicPayloadSchema = z.object({
  id: z.string().optional(),
  condition: z.record(z.any()).optional(),
  conditions: z.array(z.record(z.any())).optional(),
  connector: z.enum(['and', 'or']).optional(),
  action: z.record(z.any())
})

const logicRuleSchema = z.object({
  fieldId: z.string(),
  payloads: z.array(logicPayloadSchema),
  defaultNavigate: z.object({ fieldId: z.string() }).optional()
})

const updateFormLogicSchema = z.object({
  formId: z.string(),
  logics: z.array(logicRuleSchema)
})

const variableInputSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  kind: z.enum(['string', 'number']),
  value: z.union([z.string(), z.number()]).optional(),
  logics: z.array(z.any()).optional()
})

const hiddenFieldInputSchema = z.object({
  id: z.string().optional(),
  name: z.string()
})

const createFormSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().optional(),
  fields: z.array(fieldInputSchema).optional(),
  logics: z.array(logicRuleSchema).optional(),
  variables: z.array(variableInputSchema).optional(),
  hiddenFields: z.array(hiddenFieldInputSchema).optional()
})

const updateFormVariablesSchema = z.object({
  formId: z.string(),
  variables: z.array(variableInputSchema)
})

const updateFormHiddenFieldsSchema = z.object({
  formId: z.string(),
  hiddenFields: z.array(hiddenFieldInputSchema)
})

const submitResponseSchema = z.object({
  formId: z.string(),
  answers: z.array(
    z.object({
      id: z.string(),
      value: z.any()
    })
  ),
  hiddenFields: z.record(z.string(), z.union([z.string(), z.number()])).optional()
})

const updateFormStatusSchema = z.object({
  formId: z.string(),
  status: z.union([z.literal(1), z.literal(2)])
})

const updateFormFieldsSchema = z.object({
  formId: z.string(),
  fields: z.array(fieldInputSchema).min(1)
})

const updateFormFieldSchema = z.object({
  formId: z.string(),
  fieldId: z.string(),
  title: z.any().optional(),
  description: z.any().optional(),
  properties: z.any().optional(),
  validations: z.any().optional()
})

const publishFormSchema = z.object({
  formId: z.string()
})

const FIELD_KIND_ENUM_VALUES = [
  'group',
  'welcome',
  'thank_you',
  'statement',
  'short_text',
  'long_text',
  'number',
  'yes_no',
  'multiple_choice',
  'picture_choice',
  'file_upload',
  'opinion_scale',
  'rating',
  'date',
  'date_range',
  'time',
  'input_table',
  'matrix',
  'ranking',
  'payment',
  'full_name',
  'address',
  'email',
  'url',
  'phone_number',
  'country_selector',
  'signature',
  'legal_terms',
  'submit_date',
  'hidden_fields',
  'variable',
  'hidden_checkbox',
  'custom_text',
  'custom_single',
  'custom_multiple',
  'custom_date',
  'custom_number',
  'custom_checkbox'
]

const FIELD_KINDS_REFERENCE = {
  titleFormat: 'string OR array of strings (translations). Example: ["Hello", "Привет"]',
  answerValueFormat: {
    common: 'Each answer is { id: fieldId, value: <format below> }',
    opinion_scale: 'number within [start .. start+total-1], e.g. 4',
    rating: 'number within [1 .. total]',
    yes_no: 'boolean true|false',
    short_text: 'string',
    long_text: 'string',
    email: 'string',
    url: 'string',
    phone_number: 'string',
    number: 'number',
    multiple_choice:
      'object { value: string[] of choice ids, other?: string } — plain array of ids is also accepted and auto-wrapped',
    picture_choice: 'same as multiple_choice',
    date: 'string YYYY-MM-DD',
    date_range: 'object { start: string, end: string }',
    time: 'string HH:mm',
    full_name: 'object { firstName: string, lastName: string }',
    ranking: 'object { value: string[] of choice ids in ranked order }',
    matrix: 'object { [rowId]: columnId | columnId[] }',
    file_upload: 'array of { url or id }'
  },
  commonField: {
    id: 'auto-generated if omitted',
    kind: 'required, see kinds',
    title: 'string | string[], required for question kinds',
    description: 'string | string[], optional',
    validations: 'object { required?: boolean, min?: number, max?: number }'
  },
  systemKinds: [
    'group',
    'variable',
    'hidden_fields',
    'hidden_checkbox',
    'submit_date',
    'custom_text',
    'custom_single',
    'custom_multiple',
    'custom_date',
    'custom_number',
    'custom_checkbox'
  ],
  kinds: {
    multiple_choice: {
      properties: {
        choices: 'array of { id?: string (auto), label: string }',
        allowMultiple: 'boolean',
        allowOther: 'boolean',
        otherChoiceLabel: 'string, label for Other option',
        randomize: 'boolean',
        verticalAlignment: 'boolean',
        badge: 'string',
        choiceStyle: 'string'
      },
      validations: 'object { required?: boolean, min?: number, max?: number }'
    },
    picture_choice: {
      properties: {
        choices: 'array of { id?: string (auto), label: string }',
        allowMultiple: 'boolean',
        allowOther: 'boolean',
        otherChoiceLabel: 'string, label for Other option',
        randomize: 'boolean',
        verticalAlignment: 'boolean',
        badge: 'string',
        choiceStyle: 'string'
      },
      validations: 'object { required?: boolean, min?: number, max?: number }'
    },
    opinion_scale: {
      properties: {
        total: 'number 5-10, default 5 (NOT steps!)',
        start: 'number 0|1, default 1',
        leftLabel: 'string (NOT labels array!)',
        centerLabel: 'string',
        rightLabel: 'string',
        shape: 'string',
        hideMarks: 'boolean'
      },
      validations: 'object { required?: boolean }'
    },
    rating: {
      properties: {
        shape: 'string, e.g. star|circle',
        total: 'number, default 5'
      },
      validations: 'object { required?: boolean }'
    },
    yes_no: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    short_text: {
      properties: {},
      validations: 'object { required?: boolean, min?: number, max?: number }'
    },
    long_text: {
      properties: {},
      validations: 'object { required?: boolean, min?: number, max?: number }'
    },
    email: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    url: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    number: {
      properties: {},
      validations: 'object { required?: boolean, min?: number, max?: number }'
    },
    date: {
      properties: {
        format: 'string',
        allowTime: 'boolean',
        use12Hours: 'boolean'
      },
      validations: 'object { required?: boolean }'
    },
    date_range: {
      properties: {
        format: 'string',
        allowTime: 'boolean',
        use12Hours: 'boolean'
      },
      validations: 'object { required?: boolean }'
    },
    time: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    matrix: {
      properties: {
        rows: 'array of {id?, label}',
        matrixColumns: 'array of {id?, label}',
        matrixType: "'single' | 'multi'"
      },
      validations: 'object { required?: boolean }'
    },
    ranking: {
      properties: {
        choices: 'array of {id?, label}'
      },
      validations: 'object { required?: boolean }'
    },
    payment: {
      properties: {
        currency: 'string',
        price: 'number'
      },
      validations: 'object { required?: boolean }'
    },
    phone_number: {
      properties: {
        defaultCountryCode: 'string'
      },
      validations: 'object { required?: boolean }'
    },
    full_name: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    address: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    country_selector: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    signature: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    file_upload: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    input_table: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    legal_terms: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    welcome: {
      properties: {
        buttonText: 'string',
        buttonLinkUrl: 'string'
      },
      validations: 'object { required?: boolean }'
    },
    statement: {
      properties: {
        buttonText: 'string'
      },
      validations: 'object { required?: boolean }'
    },
    thank_you: {
      properties: {
        buttonText: 'string',
        redirectUrl: 'string'
      },
      validations: 'object { required?: boolean }'
    },
    group: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    variable: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    hidden_fields: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    hidden_checkbox: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    submit_date: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    custom_text: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    custom_single: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    custom_multiple: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    custom_date: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    custom_number: {
      properties: {},
      validations: 'object { required?: boolean }'
    },
    custom_checkbox: {
      properties: {},
      validations: 'object { required?: boolean }'
    }
  }
}

const LOGIC_REFERENCE = {
  ruleStructure:
    'One logic rule per source field: { fieldId, payloads: LogicPayload[], defaultNavigate?: { fieldId } }. When a respondent answers the source field, payloads are evaluated in order; the FIRST match navigates. If none match, defaultNavigate applies. No rule = go to next field in order.',
  payloadStructure:
    '{ id (auto-generated), condition: { fieldId, comparison, expected }, conditions?: LogicCondition[] (multi-condition, connector "and"|"or"), action: { kind: "navigate", fieldId: destination } }',
  conditionSourceNote:
    'The subject of a condition is either a question or a variable. Question subject: condition.fieldId MUST be the rule source field itself (a warning is returned when it differs); the answer of the source field is compared. Variable subject: set condition.fieldId to the id of a form variable (see update_form_variables) — the CURRENT computed variable value is compared, and no source-field warning is produced. Answer values format: see answerValueFormat in get_field_kinds_reference',
  expectedByKind: {
    multiple_choice:
      'choice id OR choice label (auto-resolved to id, case-insensitive); string or string[] for contains/is_not comparisons',
    picture_choice:
      'choice id OR choice label (auto-resolved to id, case-insensitive); string or string[] for contains/is_not comparisons',
    yes_no: 'choice id or label "Yes"/"No" (case-insensitive, auto-resolved)',
    legal_terms: 'boolean true | false',
    date: 'string YYYY-MM-DD',
    number: 'number',
    rating: 'number',
    opinion_scale: 'number',
    short_text: 'string',
    long_text: 'string',
    email: 'string',
    url: 'string',
    phone_number: 'string',
    country_selector: 'string',
    otherKinds: 'no expected (is_empty/is_not_empty only)'
  },
  comparisonsByKind: {
    text: ['is', 'is_not', 'contains', 'does_not_contain', 'starts_with', 'ends_with'],
    choice: ['is', 'is_not', 'contains', 'does_not_contain'],
    yes_no_legal_terms: ['is', 'is_not'],
    date: ['is', 'is_not', 'is_before', 'is_after'],
    number: [
      'equal',
      'not_equal',
      'greater_than',
      'less_than',
      'greater_or_equal_than',
      'less_or_equal_than'
    ],
    other: ['is_empty', 'is_not_empty'],
    statement: ['is_empty'],
    variableNumber: [
      'equal',
      'not_equal',
      'greater_than',
      'less_than',
      'greater_or_equal_than',
      'less_or_equal_than'
    ],
    variableString: ['is', 'is_not', 'contains', 'does_not_contain', 'starts_with', 'ends_with'],
    note: 'is_empty/is_not_empty (no expected) are allowed for any question kind; statement fields accept ONLY is_empty, which means ALWAYS. Variables do NOT support is_empty/is_not_empty (a variable always has a value): comparisons are chosen by variable kind (number → variableNumber, string → variableString)'
  },
  statementRule:
    'statement has no answer: its rule must use condition { fieldId: <statement id>, comparison: "is_empty" } meaning ALWAYS (the jump happens right after the screen is shown). is_not_empty and any other comparison are rejected, and no expected value is used or stored. A statement is also a valid navigate destination (it is shown, then flow continues).',
  navigateRules:
    'Destination must be an EXISTING question, statement, or thank_you field. statement is a display-only screen (no answer): it is a valid navigation destination and a valid rule SOURCE. A statement rule is an unconditional jump: its condition MUST be { fieldId: <statement id>, comparison: "is_empty" } which means ALWAYS; is_not_empty and every other comparison are rejected. statement navigation is evaluated after the screen is shown. Jumps may go backward, forward, or to a parallel branch, but the logic graph MUST stay acyclic: a cycle (q1 → q2 → q1, including through a statement) or a self-loop (q1 → q1) is rejected with an error. thank_you is a valid terminator destination. welcome, group and thank_you are never valid rule sources. Skipped fields are excluded from submissions.',
  hiddenFields:
    'Hidden fields are not visible to respondents: values are captured from URL query params (?utm_source=newsletter) and saved to submission.hiddenFields. Insert them in texts via <span data-hiddenfield="<name>"> — the attribute is the hidden field NAME, not its id. Manage them via update_form_hidden_fields.',
  variables: {
    structure:
      'form.variables: [{ id, name, kind: "string"|"number", value: <default>, logics?: LogicPayload[] }]. Manage via update_form_variables.',
    defaults:
      'value is the initial accumulator and is REQUIRED for calculation: number → 0, string → "". If omitted, defaults are auto-added.',
    calculateAction:
      '{ kind: "calculate", variable: <variableId>, operator, value?, ref? } — value: literal (number for number vars, string for string vars); ref: fieldId to take the answer value instead of a literal. Either value or ref is required.',
    operators: {
      number: ['addition', 'subtraction', 'multiplication', 'division', 'assignment'],
      string: ['addition', 'assignment']
    },
    evaluation:
      'Per field, matching CALCULATE actions run in payload order and update accumulators, then NAVIGATE rules apply. Variables are available in texts via <span data-variable="<id>"> and saved to submission.variables.',
    logics:
      'variable.logics are stored for round-trip fidelity but are NOT executed: calculations must be defined in form.logics as field rules with calculate actions (update_form_logic). Calculate payloads inside variable.logics produce a warning.',
    conditions:
      'A condition subject can be a question OR a variable. Question subject: condition.fieldId must equal the rule source field (the source field answer is compared). Variable subject: condition.fieldId = variable id, compared against the CURRENT computed variable value; comparisons by variable kind (number: equal/not_equal/greater_than/less_than/greater_or_equal_than/less_or_equal_than with a numeric expected; string: is/is_not/contains/does_not_contain/starts_with/ends_with with a string expected). is_empty/is_not_empty are NOT supported for variables. Evaluation order per field: calculate payloads run first, then navigate payloads — so a rule on the same field sees the value already updated by its calculate actions.'
  },
  example: {
    fieldId: 'q1',
    payloads: [
      {
        id: 'pl1',
        condition: {
          fieldId: 'q1',
          comparison: 'is',
          expected: 'yes'
        },
        action: {
          kind: 'navigate',
          fieldId: 'q2'
        }
      },
      {
        id: 'pl2',
        condition: {
          fieldId: 'q1',
          comparison: 'is',
          expected: 'no'
        },
        action: {
          kind: 'navigate',
          fieldId: 'q3'
        }
      }
    ],
    defaultNavigate: {
      fieldId: 'q3'
    }
  }
}

const NUMBER_CALCULATE_OPERATORS = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'assignment'
]

const STRING_CALCULATE_OPERATORS = ['addition', 'assignment']

const ALLOWED_PROPERTY_KEYS = [
  'showButton',
  'buttonText',
  'hideMarks',
  'allowOther',
  'allowMultiple',
  'badge',
  'verticalAlignment',
  'choices',
  'randomize',
  'choiceStyle',
  'other',
  'otherChoiceLabel',
  'numberPreRow',
  'shape',
  'total',
  'start',
  'leftLabel',
  'centerLabel',
  'rightLabel',
  'defaultCountryCode',
  'currency',
  'price',
  'format',
  'allowTime',
  'use12Hours',
  'tableColumns',
  'matrixType',
  'rows',
  'matrixColumns',
  'score',
  'sourceUrl',
  'buttonLinkUrl',
  'redirectUrl',
  'fields'
]

@Injectable()
export class McpService {
  constructor(
    private readonly formService: FormService,
    private readonly submissionService: SubmissionService,
    private readonly formReportService: FormReportService,
    private readonly projectService: ProjectService
  ) {}

  async handlePost(req: Request, res: Response): Promise<void> {
    let requestId: string | number | null = null

    try {
      const contentType = req.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        res.status(415).json({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Unsupported media type' },
          id: null
        })
        return
      }

      const sessionId = req.headers['mcp-session-id']
      if (sessionId) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Session ID not allowed in stateless mode' },
          id: null
        })
        return
      }

      const body = req.body as McpRequest
      requestId = body?.id ?? null

      if (body.jsonrpc !== '2.0') {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Invalid JSON-RPC request' },
          id: requestId
        })
        return
      }

      if (body.id === undefined) {
        res.status(202).send()
        return
      }

      const team = (req as any).team as TeamModel
      const apiToken = (req as any).apiToken as ApiTokenModel
      const context: ToolContext = {
        teamId: team._id.toString(),
        userId: apiToken.userId,
        tokenScope: apiToken.scope
      }

      const result = await this.handleJsonRpc(body, context)
      res.set('Content-Type', 'application/json')
      res.json({
        jsonrpc: '2.0',
        result,
        id: requestId
      })
    } catch (err) {
      if (err instanceof McpError) {
        res.set('Content-Type', 'application/json')
        res.json({
          jsonrpc: '2.0',
          error: { code: err.code, message: err.message },
          id: requestId
        })
        return
      }

      const message = err instanceof Error ? err.message : 'Internal error'
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message },
        id: requestId
      })
    }
  }

  private async handleJsonRpc(
    request: McpRequest,
    context: ToolContext
  ): Promise<Record<string, any> | null> {
    const method = request.method
    const params = request.params || {}

    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'heyform-mcp', version: '1.0.0' }
        }

      case 'ping':
        return {}

      case 'tools/list':
        return {
          tools: this.getTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        }

      case 'tools/call':
        return this.handleToolCall(params, context)

      default:
        throw new McpError(-32601, 'Method not found')
    }
  }

  private async handleToolCall(
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolCallResult> {
    const name = params.name
    const args = params.arguments || {}
    const tool = this.getTools().find(t => t.name === name)

    if (!tool) {
      throw new McpError(-32602, `Tool not found: ${name}`)
    }

    try {
      const data = await tool.handler(args, context)
      return {
        content: [{ type: 'text', text: JSON.stringify(data) }]
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution failed'
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true
      }
    }
  }

  private getTools(): McpToolDefinition[] {
    return [
      {
        name: 'get_field_kinds_reference',
        description:
          'Get canonical field kinds reference: valid properties, validations and title format for each field kind. Call this BEFORE create_form or update_form_fields to learn the exact property names.',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => FIELD_KINDS_REFERENCE
      },
      {
        name: 'get_logic_reference',
        description:
          'Get canonical branching logic reference: rule/payload/condition structure, comparisons and expected value formats per field kind, navigation rules for an acyclic graph, and a full example.',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => LOGIC_REFERENCE
      },
      {
        name: 'list_projects',
        description:
          'List all projects in the workspace with their names and form counts. Use project names to disambiguate forms in list_forms.',
        inputSchema: { type: 'object', properties: {} },
        handler: this.listProjects.bind(this)
      },
      {
        name: 'list_forms',
        description:
          'List all forms in the team with response counts, each form includes its project name and id',
        inputSchema: { type: 'object', properties: {} },
        handler: this.listForms.bind(this)
      },
      {
        name: 'get_form_schema',
        description:
          'Get the schema (questions/fields) of a form, including logics (branching rules), variables and hiddenFields. Use source=drafts to read unpublished edits',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            source: {
              type: 'string',
              enum: ['published', 'drafts'],
              description:
                "'drafts' returns the exact unpublished state; echo field ids back in update_form_fields to keep submissions linked"
            }
          },
          required: ['formId']
        },
        handler: this.getFormSchema.bind(this)
      },
      {
        name: 'get_form_report',
        description: 'Get aggregated report data for a form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' }
          },
          required: ['formId']
        },
        handler: this.getFormReport.bind(this)
      },
      {
        name: 'list_submissions',
        description: 'List submissions for a form with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            isCompleted: { type: 'boolean', description: 'Filter by completion status' }
          },
          required: ['formId']
        },
        handler: this.listSubmissions.bind(this)
      },
      {
        name: 'get_submissions_summary',
        description: 'Get submission counts and completion rate for a form',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' }
          },
          required: ['formId']
        },
        handler: this.getSubmissionsSummary.bind(this)
      },
      {
        name: 'create_form',
        description:
          'Create a new form in the team, optionally with full question fields, logics[] for branching, variables[] (calculated values) and hiddenFields[] captured from URL query params. IMPORTANT: call get_field_kinds_reference first — property names are canonical (e.g. opinion_scale uses total/start/leftLabel, not steps/labels) (read_write tokens only)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The form name' },
            projectId: { type: 'string', description: 'Optional project ID' },
            fields: {
              type: 'array',
              description: 'Optional array of form fields',
              items: {
                type: 'object',
                properties: {
                  kind: { type: 'string', enum: FIELD_KIND_ENUM_VALUES, description: 'Field kind' },
                  title: { description: 'Field title' },
                  description: { description: 'Field description' },
                  properties: {
                    type: 'object',
                    description:
                      'Field-type-specific properties. See get_field_kinds_reference. Common: choices/allowOther/total/start/leftLabel/rightLabel',
                    additionalProperties: true
                  },
                  validations: { description: 'Field validations' }
                },
                required: ['kind']
              }
            },
            logics: {
              type: 'array',
              description: 'Optional array of branching logic rules. See get_logic_reference.',
              items: {
                type: 'object',
                properties: {
                  fieldId: { type: 'string', description: 'Source field id' },
                  payloads: {
                    type: 'array',
                    description: 'Payloads evaluated in order',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'Optional payload id (auto-generated if omitted)'
                        },
                        condition: {
                          type: 'object',
                          properties: {
                            fieldId: {
                              type: 'string',
                              description: 'Field id to evaluate (source or earlier field)'
                            },
                            comparison: { type: 'string', description: 'Comparison operator' },
                            expected: { description: 'Expected value' }
                          },
                          required: ['fieldId', 'comparison']
                        },
                        conditions: {
                          type: 'array',
                          description: 'Additional conditions for multi-condition logic',
                          items: {
                            type: 'object',
                            properties: {
                              fieldId: { type: 'string', description: 'Field id to evaluate' },
                              comparison: { type: 'string', description: 'Comparison operator' },
                              expected: { description: 'Expected value' }
                            },
                            required: ['fieldId', 'comparison']
                          }
                        },
                        connector: {
                          type: 'string',
                          enum: ['and', 'or'],
                          description: 'Connector for multiple conditions'
                        },
                        action: {
                          type: 'object',
                          properties: {
                            kind: {
                              type: 'string',
                              enum: ['navigate', 'calculate'],
                              description:
                                'Action kind: navigate (branching) or calculate (update a variable accumulator)'
                            },
                            fieldId: {
                              type: 'string',
                              description: 'navigate only: destination field id'
                            },
                            variable: {
                              type: 'string',
                              description: 'calculate only: target variable id'
                            },
                            operator: {
                              type: 'string',
                              enum: [
                                'addition',
                                'subtraction',
                                'multiplication',
                                'division',
                                'assignment'
                              ],
                              description:
                                'calculate only: string variables allow addition and assignment only'
                            },
                            value: {
                              description:
                                'calculate only: literal value (number for number variables, string for string variables)'
                            },
                            ref: {
                              type: 'string',
                              description:
                                'calculate only: field id to take the answer value from instead of a literal'
                            }
                          },
                          required: ['kind']
                        }
                      },
                      required: ['action']
                    }
                  },
                  defaultNavigate: {
                    type: 'object',
                    properties: {
                      fieldId: { type: 'string', description: 'Default destination field id' }
                    },
                    required: ['fieldId']
                  }
                },
                required: ['fieldId', 'payloads']
              }
            },
            variables: {
              type: 'array',
              description:
                'Optional array of variables (calculated values). See get_logic_reference.',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional variable id (auto-generated)' },
                  name: { type: 'string', description: 'Variable name, unique within the form' },
                  kind: {
                    type: 'string',
                    enum: ['string', 'number'],
                    description: 'Variable kind'
                  },
                  value: {
                    description:
                      'Initial value (default): number → 0, string → "". Must match kind.'
                  },
                  logics: {
                    type: 'array',
                    description: 'Optional calculate/navigate payloads owned by this variable',
                    items: { type: 'object', additionalProperties: true }
                  }
                },
                required: ['name', 'kind']
              }
            },
            hiddenFields: {
              type: 'array',
              description:
                'Optional array of hidden fields. Values are captured from URL query params (?name=value) and saved to submission.hiddenFields',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional hidden field id (auto-generated)' },
                  name: {
                    type: 'string',
                    description: 'Query param name, unique within the form'
                  }
                },
                required: ['name']
              }
            }
          },
          required: ['name']
        },
        handler: this.createForm.bind(this)
      },
      {
        name: 'submit_response',
        description:
          'Submit answers to a form programmatically (read_write tokens only). Answer value formats per field kind are documented in get_field_kinds_reference (answerValueFormat). Optional hiddenFields: { [name]: value } is saved to submission.hiddenFields; calculated variables are evaluated and saved to submission.variables',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Field ID' },
                  value: { description: 'Answer value' }
                },
                required: ['id', 'value']
              },
              description: 'Array of answer objects'
            },
            hiddenFields: {
              type: 'object',
              description:
                'Optional hidden field values by name, e.g. { "utm_source": "newsletter" }. Saved to submission.hiddenFields',
              additionalProperties: { type: ['string', 'number'] }
            }
          },
          required: ['formId', 'answers']
        },
        handler: this.submitResponse.bind(this)
      },
      {
        name: 'update_form_status',
        description: 'Update form status (1 = normal, 2 = trash) (read_write tokens only)',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            status: {
              type: 'integer',
              enum: [1, 2],
              description: '1 for normal, 2 for trash'
            }
          },
          required: ['formId', 'status']
        },
        handler: this.updateFormStatus.bind(this)
      },
      {
        name: 'update_form_fields',
        description:
          'Replace all form questions (drafts) with provided fields. IMPORTANT: call get_field_kinds_reference first — property names are canonical (read_write tokens only)',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            fields: {
              type: 'array',
              description: 'Array of form fields',
              items: {
                type: 'object',
                properties: {
                  kind: { type: 'string', enum: FIELD_KIND_ENUM_VALUES, description: 'Field kind' },
                  title: { description: 'Field title' },
                  description: { description: 'Field description' },
                  properties: {
                    type: 'object',
                    description:
                      'Field-type-specific properties. See get_field_kinds_reference. Common: choices/allowOther/total/start/leftLabel/rightLabel',
                    additionalProperties: true
                  },
                  validations: { description: 'Field validations' }
                },
                required: ['kind']
              }
            }
          },
          required: ['formId', 'fields']
        },
        handler: this.updateFormFields.bind(this)
      },
      {
        name: 'update_form_field',
        description:
          'Update a single field in form drafts by id (title, description, properties, validations). Properties and validations are shallow-merged: provided keys override, others untouched. Read current state via get_form_schema with source=drafts (read_write tokens only)',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            fieldId: { type: 'string', description: 'The field ID' },
            title: { description: 'Field title' },
            description: { description: 'Field description' },
            properties: {
              type: 'object',
              description:
                'Field-type-specific properties. Shallow-merged with existing properties.',
              additionalProperties: true
            },
            validations: {
              type: 'object',
              description: 'Field validations. Shallow-merged with existing validations.'
            }
          },
          required: ['formId', 'fieldId']
        },
        handler: this.updateFormField.bind(this)
      },
      {
        name: 'update_form_hidden_fields',
        description:
          'Replace the entire set of hidden fields. Hidden fields are not visible to respondents: values are captured from URL query params (e.g. ?utm_source=newsletter) and saved to submission.hiddenFields. They can be shown in texts via <span data-hiddenfield="<id>">. (read_write tokens only)',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            hiddenFields: {
              type: 'array',
              description: 'Array of hidden fields (replaces the current set)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional hidden field id (auto-generated)' },
                  name: { type: 'string', description: 'Query param name, unique within the form' }
                },
                required: ['name']
              }
            }
          },
          required: ['formId', 'hiddenFields']
        },
        handler: this.updateFormHiddenFields.bind(this)
      },
      {
        name: 'update_form_logic',
        description:
          'Replace the entire form logic (branching rules). Semantic validation: field/choice references, per-kind comparisons, acyclic navigation graph (cycles are rejected). Answer value formats: get_field_kinds_reference. Logic rules reference: get_logic_reference. (read_write tokens only)',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            logics: {
              type: 'array',
              description: 'Array of logic rules',
              items: {
                type: 'object',
                properties: {
                  fieldId: { type: 'string', description: 'Source field id' },
                  payloads: {
                    type: 'array',
                    description: 'Payloads evaluated in order',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'Optional payload id (auto-generated if omitted)'
                        },
                        condition: {
                          type: 'object',
                          properties: {
                            fieldId: {
                              type: 'string',
                              description: 'Field id to evaluate (source or earlier field)'
                            },
                            comparison: { type: 'string', description: 'Comparison operator' },
                            expected: { description: 'Expected value' }
                          },
                          required: ['fieldId', 'comparison']
                        },
                        conditions: {
                          type: 'array',
                          description: 'Additional conditions for multi-condition logic',
                          items: {
                            type: 'object',
                            properties: {
                              fieldId: { type: 'string', description: 'Field id to evaluate' },
                              comparison: { type: 'string', description: 'Comparison operator' },
                              expected: { description: 'Expected value' }
                            },
                            required: ['fieldId', 'comparison']
                          }
                        },
                        connector: {
                          type: 'string',
                          enum: ['and', 'or'],
                          description: 'Connector for multiple conditions'
                        },
                        action: {
                          type: 'object',
                          properties: {
                            kind: {
                              type: 'string',
                              enum: ['navigate', 'calculate'],
                              description:
                                'Action kind: navigate (branching) or calculate (update a variable accumulator)'
                            },
                            fieldId: {
                              type: 'string',
                              description: 'navigate only: destination field id'
                            },
                            variable: {
                              type: 'string',
                              description: 'calculate only: target variable id'
                            },
                            operator: {
                              type: 'string',
                              enum: [
                                'addition',
                                'subtraction',
                                'multiplication',
                                'division',
                                'assignment'
                              ],
                              description:
                                'calculate only: string variables allow addition and assignment only'
                            },
                            value: {
                              description:
                                'calculate only: literal value (number for number variables, string for string variables)'
                            },
                            ref: {
                              type: 'string',
                              description:
                                'calculate only: field id to take the answer value from instead of a literal'
                            }
                          },
                          required: ['kind']
                        }
                      },
                      required: ['action']
                    }
                  },
                  defaultNavigate: {
                    type: 'object',
                    properties: {
                      fieldId: { type: 'string', description: 'Default destination field id' }
                    },
                    required: ['fieldId']
                  }
                },
                required: ['fieldId', 'payloads']
              }
            }
          },
          required: ['formId', 'logics']
        },
        handler: this.updateFormLogic.bind(this)
      },
      {
        name: 'update_form_variables',
        description:
          'Replace the entire set of variables (calculated values). Each variable has a default value and optional logic rules with calculate actions. Variables are available in texts via <span data-variable="<id>"> and saved to submission.variables. Format and operator rules: get_logic_reference. (read_write tokens only)',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' },
            variables: {
              type: 'array',
              description: 'Array of variables (replaces the current set)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional variable id (auto-generated)' },
                  name: { type: 'string', description: 'Variable name, unique within the form' },
                  kind: {
                    type: 'string',
                    enum: ['string', 'number'],
                    description: 'Variable kind'
                  },
                  value: {
                    description:
                      'Initial value (default): number → 0, string → "". Must match kind.'
                  },
                  logics: {
                    type: 'array',
                    description:
                      'Optional calculate/navigate payloads owned by this variable. Calculates run before navigates.',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'Optional payload id' },
                        condition: {
                          type: 'object',
                          properties: {
                            fieldId: { type: 'string', description: 'Question field id' },
                            comparison: { type: 'string', description: 'Comparison operator' },
                            expected: { description: 'Expected value' }
                          },
                          required: ['fieldId', 'comparison']
                        },
                        conditions: {
                          type: 'array',
                          description: 'Additional conditions (connector and/or)',
                          items: { type: 'object', additionalProperties: true }
                        },
                        connector: { type: 'string', enum: ['and', 'or'] },
                        action: {
                          type: 'object',
                          properties: {
                            kind: {
                              type: 'string',
                              enum: ['navigate', 'calculate'],
                              description: 'Action kind'
                            },
                            fieldId: {
                              type: 'string',
                              description: 'navigate only: destination field id'
                            },
                            variable: {
                              type: 'string',
                              description: 'calculate only: target variable id'
                            },
                            operator: {
                              type: 'string',
                              enum: [
                                'addition',
                                'subtraction',
                                'multiplication',
                                'division',
                                'assignment'
                              ],
                              description:
                                'calculate only: string variables allow addition and assignment only'
                            },
                            value: {
                              description:
                                'calculate only: literal value (number for number variables, string for string variables)'
                            },
                            ref: {
                              type: 'string',
                              description:
                                'calculate only: field id to take the answer value from instead of a literal'
                            }
                          },
                          required: ['kind']
                        }
                      },
                      required: ['action']
                    }
                  }
                },
                required: ['name', 'kind']
              }
            }
          },
          required: ['formId', 'variables']
        },
        handler: this.updateFormVariables.bind(this)
      },
      {
        name: 'publish_form',
        description:
          'Publish a form: activate it and copy drafts to published fields (read_write tokens only)',
        inputSchema: {
          type: 'object',
          properties: {
            formId: { type: 'string', description: 'The form ID' }
          },
          required: ['formId']
        },
        handler: this.publishForm.bind(this)
      }
    ]
  }

  private async findFormInTeam(formId: string, teamId: string) {
    const form = await this.formService.findById(formId)
    if (!form || form.teamId !== teamId) {
      throw new Error('Form not found')
    }
    return form
  }

  private requireWriteScope(scope: string): void {
    if (scope !== 'read_write') {
      throw new Error('Token is read-only')
    }
  }

  private buildFormFields(
    fields: any[],
    existingDrafts: any[] = []
  ): { fields: any[]; warnings: string[] } {
    const validKinds = Object.values(FieldKindEnum)
    const warnings: string[] = []

    const getTitle = (title: any): any => (Array.isArray(title) ? title[0] : title)

    const builtFields = fields.map(field => {
      const kind = field.kind
      const fieldRef = field.id || kind

      if (!kind || !validKinds.includes(kind)) {
        throw new Error(`Invalid field kind: ${kind}`)
      }

      if (kind !== FieldKindEnum.WELCOME && kind !== FieldKindEnum.THANK_YOU && !field.title) {
        throw new Error('Field title is required')
      }

      let fieldId = field.id
      if (!fieldId) {
        const existingField = existingDrafts.find(
          (f: any) => f.kind === kind && getTitle(f.title) === getTitle(field.title)
        )
        if (existingField) {
          fieldId = existingField.id
          warnings.push(`field '${kind}': matched existing field by kind+title, preserved id`)
        } else {
          fieldId = nanoid(12)
        }
      }

      let properties = { ...(field.properties || {}) }

      if (kind === FieldKindEnum.OPINION_SCALE || kind === FieldKindEnum.RATING) {
        if (properties.steps !== undefined && properties.total === undefined) {
          properties.total = properties.steps
          delete properties.steps
          warnings.push(`field '${fieldRef}': 'steps' normalized to 'total'`)
        }

        if (
          Array.isArray(properties.labels) &&
          properties.labels.length === 2 &&
          typeof properties.labels[0] === 'string' &&
          typeof properties.labels[1] === 'string' &&
          properties.leftLabel === undefined &&
          properties.rightLabel === undefined
        ) {
          properties.leftLabel = properties.labels[0]
          properties.rightLabel = properties.labels[1]
          delete properties.labels
          warnings.push(`field '${fieldRef}': 'labels' normalized to 'leftLabel'/'rightLabel'`)
        }

        if (kind === FieldKindEnum.OPINION_SCALE && properties.start === undefined) {
          properties.start = 1
        }
      }

      if (
        properties.choices &&
        (kind === FieldKindEnum.MULTIPLE_CHOICE || kind === FieldKindEnum.PICTURE_CHOICE)
      ) {
        const existingField = existingDrafts.find((f: any) => f.id === fieldId)
        const existingChoices = existingField?.properties?.choices || []
        properties = {
          ...properties,
          choices: properties.choices.map((choice: any) => {
            if (choice.id) {
              return choice
            }
            const existingChoice = existingChoices.find((c: any) => c.label === choice.label)
            if (existingChoice) {
              warnings.push(
                `field '${kind}': choice '${choice.label}' matched existing choice, preserved id`
              )
              return { ...choice, id: existingChoice.id }
            }
            return { ...choice, id: nanoid(12) }
          })
        }
      }

      if (kind === FieldKindEnum.YES_NO) {
        const hasChoices = Array.isArray(properties.choices) && properties.choices.length > 0
        if (!hasChoices) {
          properties.choices = [
            { id: nanoid(8), label: 'Yes' },
            { id: nanoid(8), label: 'No' }
          ]
          warnings.push(
            `field '${field.id || getTitle(field.title) || fieldRef}': auto-provisioned Yes/No choices`
          )
        }
      }

      const whitelisted: Record<string, any> = {}
      for (const key of Object.keys(properties)) {
        if (ALLOWED_PROPERTY_KEYS.includes(key)) {
          whitelisted[key] = properties[key]
        } else {
          warnings.push(`field '${fieldRef}': dropped unknown property '${key}'`)
        }
      }

      return {
        ...field,
        id: fieldId,
        properties: whitelisted,
        validations: field.validations || { required: false }
      }
    })

    return { fields: builtFields, warnings }
  }

  private validateAndNormalizeLogics(
    logics: any[],
    fields: any[],
    warnings: string[],
    variables: any[] = []
  ): any[] {
    const flatFields = flattenFields(fields, true)
    const fieldMap = new Map<string, { field: any; index: number }>()
    flatFields.forEach((field, index) => fieldMap.set(field.id, { field, index }))

    const seenSourceIds = new Set<string>()
    const normalizedLogics: any[] = []

    for (const rule of logics) {
      if (!rule || typeof rule !== 'object') {
        throw new BadRequestException('Logic rule must be an object')
      }

      const sourceFieldInfo = fieldMap.get(rule.fieldId)
      if (!sourceFieldInfo) {
        throw new BadRequestException(`Source field ${rule.fieldId} not found`)
      }

      if (seenSourceIds.has(rule.fieldId)) {
        throw new BadRequestException(`Duplicate logic rule for field ${rule.fieldId}`)
      }
      seenSourceIds.add(rule.fieldId)

      const sourceIndex = sourceFieldInfo.index
      const normalizedPayloads: any[] = []

      for (const payload of rule.payloads || []) {
        if (!payload || typeof payload !== 'object') {
          throw new BadRequestException('Logic payload must be an object')
        }

        if (!payload.id) {
          payload.id = nanoid(8)
        }

        let condition = payload.condition
        let conditions = payload.conditions
        let connector = payload.connector

        if (
          (!condition || typeof condition !== 'object') &&
          Array.isArray(conditions) &&
          conditions.length > 0
        ) {
          condition = conditions[0]
        }

        if (Array.isArray(conditions) && conditions.length > 0) {
          connector = connector === 'or' ? 'or' : 'and'
        } else {
          conditions = undefined
          connector = undefined
        }

        this.validateLogicCondition(
          condition,
          sourceIndex,
          fieldMap,
          warnings,
          rule.fieldId,
          variables
        )

        if (conditions) {
          for (const c of conditions) {
            this.validateLogicCondition(c, sourceIndex, fieldMap, warnings, rule.fieldId, variables)
          }
        }

        const action = payload.action
        if (!action || typeof action !== 'object') {
          throw new BadRequestException('Payload action is required')
        }

        const contextLabel = `field ${rule.fieldId} payload ${payload.id}`
        let normalizedAction: Record<string, any>

        if (action.kind === ActionEnum.CALCULATE) {
          normalizedAction = this.normalizeCalculateAction(
            action,
            variables,
            fieldMap,
            sourceIndex,
            contextLabel,
            warnings
          )
        } else if (action.kind === ActionEnum.NAVIGATE) {
          this.validateNavigateTarget(action.fieldId, fieldMap, rule.fieldId)

          normalizedAction = {
            kind: ActionEnum.NAVIGATE,
            fieldId: action.fieldId
          }
        } else {
          throw new BadRequestException(
            `${contextLabel}: unsupported action kind '${action.kind}'. Allowed: navigate, calculate`
          )
        }

        const normalizedPayload: Record<string, any> = {
          id: payload.id,
          condition,
          action: normalizedAction
        }

        if (Array.isArray(conditions) && conditions.length > 0) {
          normalizedPayload.conditions = conditions
          normalizedPayload.connector = connector
        }

        normalizedPayloads.push(normalizedPayload)
      }

      let defaultNavigate = undefined
      if (rule.defaultNavigate && typeof rule.defaultNavigate === 'object') {
        this.validateNavigateTarget(rule.defaultNavigate.fieldId, fieldMap, rule.fieldId)
        defaultNavigate = { fieldId: rule.defaultNavigate.fieldId }
      }

      normalizedLogics.push({
        fieldId: rule.fieldId,
        payloads: normalizedPayloads,
        defaultNavigate
      })
    }

    this.assertAcyclicLogics(normalizedLogics)

    return normalizedLogics
  }

  private validateLogicCondition(
    condition: any,
    sourceIndex: number,
    fieldMap: Map<string, { field: any; index: number }>,
    warnings: string[],
    sourceFieldId?: string,
    variables: any[] = []
  ): void {
    if (!condition || typeof condition !== 'object') {
      throw new BadRequestException('Logic condition is required')
    }

    const variable =
      condition.fieldId && Array.isArray(variables)
        ? variables.find(variable => variable.id === condition.fieldId)
        : undefined

    if (variable) {
      this.validateVariableCondition(condition, variable)

      return
    }

    const conditionFieldInfo = fieldMap.get(condition.fieldId)
    if (!conditionFieldInfo) {
      throw new BadRequestException(`Condition field ${condition.fieldId} not found`)
    }

    if (conditionFieldInfo.index > sourceIndex) {
      throw new BadRequestException(
        `Condition field ${condition.fieldId} must be the source field or an earlier field`
      )
    }

    if (sourceFieldId && condition.fieldId !== sourceFieldId) {
      const note = `condition.fieldId ${condition.fieldId} differs from the rule source field ${sourceFieldId}; it is ignored at runtime (conditions are evaluated against the source field)`
      if (!warnings.includes(note)) {
        warnings.push(note)
      }
    }

    const kind = conditionFieldInfo.field.kind as FieldKindEnum

    if (kind === FieldKindEnum.STATEMENT) {
      if (condition.comparison !== ComparisonEnum.IS_EMPTY) {
        throw new BadRequestException(
          `statement fields have no answer: only 'is_empty' ('always') is supported (field ${condition.fieldId}, got comparison '${condition.comparison}')`
        )
      }

      delete condition.expected

      return
    }

    if (!this.isQuestionKind(kind)) {
      throw new BadRequestException(`Logic conditions are not supported for field kind ${kind}`)
    }

    const comparison = condition.comparison
    const allowedComparisons = this.getAllowedComparisons(kind)
    if (!allowedComparisons.includes(comparison)) {
      throw new BadRequestException(
        `Invalid comparison '${comparison}' for kind ${kind}. Allowed: ${allowedComparisons.join(', ')}`
      )
    }

    if (kind === FieldKindEnum.YES_NO) {
      const field = conditionFieldInfo.field
      if (
        !field.properties?.choices ||
        !Array.isArray(field.properties.choices) ||
        field.properties.choices.length === 0
      ) {
        if (!field.properties) {
          field.properties = {}
        }
        field.properties.choices = [
          { id: nanoid(8), label: 'Yes' },
          { id: nanoid(8), label: 'No' }
        ]
        warnings.push(`field '${field.id}': auto-provisioned Yes/No choices for logic`)
      }
    }

    if (comparison === ComparisonEnum.IS_EMPTY || comparison === ComparisonEnum.IS_NOT_EMPTY) {
      delete condition.expected
      return
    }

    const expected = condition.expected

    if (kind === FieldKindEnum.MULTIPLE_CHOICE || kind === FieldKindEnum.PICTURE_CHOICE) {
      const values = Array.isArray(expected) ? expected : [expected]
      const resolved: string[] = []
      for (const val of values) {
        if (typeof val !== 'string') {
          throw new BadRequestException(
            `Expected choice value must be a string in field ${condition.fieldId}`
          )
        }
        const choice = this.resolveChoice(conditionFieldInfo.field, val)
        if (!choice) {
          throw new BadRequestException(
            `Choice "${val}" not found in field ${condition.fieldId} (use get_form_schema to see choice ids/labels)`
          )
        }
        if (choice.resolvedByLabel) {
          warnings.push(`choice label "${val}" resolved to id ${choice.id}`)
        }
        resolved.push(choice.id)
      }
      condition.expected = Array.isArray(expected) ? resolved : resolved[0]
    } else if (kind === FieldKindEnum.YES_NO) {
      if (typeof expected === 'boolean') {
        const yesChoice = conditionFieldInfo.field.properties.choices.find(
          (c: any) => c.label?.toLowerCase() === 'yes'
        )
        const noChoice = conditionFieldInfo.field.properties.choices.find(
          (c: any) => c.label?.toLowerCase() === 'no'
        )
        condition.expected = expected ? yesChoice?.id : noChoice?.id
      } else if (typeof expected === 'string') {
        const lower = expected.toLowerCase()
        if (lower === 'yes' || lower === 'no') {
          const targetLabel = lower === 'yes' ? 'yes' : 'no'
          const choice = conditionFieldInfo.field.properties.choices.find(
            (c: any) => c.label?.toLowerCase() === targetLabel
          )
          if (!choice) {
            throw new BadRequestException(
              `Choice "${expected}" not found in field ${condition.fieldId}`
            )
          }
          warnings.push(`choice label "${expected}" resolved to id ${choice.id}`)
          condition.expected = choice.id
        } else {
          const choice = this.resolveChoice(conditionFieldInfo.field, expected)
          if (!choice) {
            throw new BadRequestException(
              `Choice "${expected}" not found in field ${condition.fieldId} (use get_form_schema to see choice ids/labels)`
            )
          }
          if (choice.resolvedByLabel) {
            warnings.push(`choice label "${expected}" resolved to id ${choice.id}`)
          }
          condition.expected = choice.id
        }
      } else {
        throw new BadRequestException(
          `Expected value for yes_no must be a boolean or string in field ${condition.fieldId}`
        )
      }
    } else if (kind === FieldKindEnum.LEGAL_TERMS) {
      if (typeof expected !== 'boolean') {
        throw new BadRequestException(
          `Expected value for legal_terms must be a boolean in field ${condition.fieldId}`
        )
      }
    } else if (kind === FieldKindEnum.DATE) {
      if (typeof expected !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expected)) {
        throw new BadRequestException(
          `Expected value for date must be YYYY-MM-DD in field ${condition.fieldId}`
        )
      }
    } else if (
      [FieldKindEnum.NUMBER, FieldKindEnum.RATING, FieldKindEnum.OPINION_SCALE].includes(kind)
    ) {
      if (typeof expected === 'string' && !isNaN(Number(expected))) {
        warnings.push(
          `expected value "${expected}" converted to number for field ${condition.fieldId}`
        )
        condition.expected = Number(expected)
      } else if (typeof expected !== 'number' || isNaN(expected)) {
        throw new BadRequestException(
          `Expected value for ${kind} must be a number in field ${condition.fieldId}`
        )
      }
    } else if (this.isTextKind(kind)) {
      if (typeof expected !== 'string') {
        throw new BadRequestException(
          `Expected value for ${kind} must be a string in field ${condition.fieldId}`
        )
      }
    } else {
      throw new BadRequestException(
        `Expected value not supported for kind ${kind} (use is_empty/is_not_empty only)`
      )
    }
  }

  private validateVariableCondition(condition: any, variable: any): void {
    const allowedComparisons = this.getAllowedVariableComparisons(variable.kind)

    if (!allowedComparisons.includes(condition.comparison)) {
      throw new BadRequestException(
        `Invalid comparison '${condition.comparison}' for ${variable.kind} variable ${variable.id}. Allowed: ${allowedComparisons.join(', ')}`
      )
    }

    const expected = condition.expected

    if (expected === undefined || expected === null) {
      throw new BadRequestException(
        `Expected value is required for ${variable.kind} variable ${variable.id}`
      )
    }

    if (variable.kind === 'number') {
      if (typeof expected !== 'number' || !isFinite(expected)) {
        throw new BadRequestException(
          `Expected value for number variable ${variable.id} must be a finite number`
        )
      }

      return
    }

    if (typeof expected !== 'string') {
      throw new BadRequestException(
        `Expected value for string variable ${variable.id} must be a string`
      )
    }
  }

  private getAllowedVariableComparisons(kind: string): ComparisonEnum[] {
    if (kind === 'number') {
      return [
        ComparisonEnum.EQUAL,
        ComparisonEnum.NOT_EQUAL,
        ComparisonEnum.GREATER_THAN,
        ComparisonEnum.LESS_THAN,
        ComparisonEnum.GREATER_OR_EQUAL_THAN,
        ComparisonEnum.LESS_OR_EQUAL_THAN
      ]
    }

    return [
      ComparisonEnum.IS,
      ComparisonEnum.IS_NOT,
      ComparisonEnum.CONTAINS,
      ComparisonEnum.DOES_NOT_CONTAIN,
      ComparisonEnum.STARTS_WITH,
      ComparisonEnum.ENDS_WITH
    ]
  }

  private resolveChoice(
    field: any,
    value: string
  ): { id: string; resolvedByLabel: boolean } | null {
    const choices = field.properties?.choices || []
    const byId = choices.find((c: any) => c.id === value)
    if (byId) {
      return { id: byId.id, resolvedByLabel: false }
    }
    const byLabel = choices.find(
      (c: any) => c.label && c.label.toLowerCase() === value.toLowerCase()
    )
    if (byLabel) {
      return { id: byLabel.id, resolvedByLabel: true }
    }
    return null
  }

  private getEditableFields(form: any): any[] {
    let drafts: any[] = []
    try {
      drafts = JSON.parse((form as any)._drafts || '[]')
    } catch {
      drafts = []
    }
    return Array.isArray(drafts) && drafts.length > 0 ? drafts : form.fields || []
  }

  private normalizeCalculateAction(
    action: any,
    variables: any[],
    fieldMap: Map<string, { field: any; index: number }>,
    sourceIndex: number | null,
    contextLabel: string,
    warnings: string[]
  ): Record<string, any> {
    if (!action.variable) {
      throw new BadRequestException(`${contextLabel}: calculate action requires variable`)
    }

    const variable = variables.find(v => v.id === action.variable)
    if (!variable) {
      throw new BadRequestException(`${contextLabel}: variable ${action.variable} not found`)
    }

    const allowedOperators =
      variable.kind === 'number' ? NUMBER_CALCULATE_OPERATORS : STRING_CALCULATE_OPERATORS
    if (!allowedOperators.includes(action.operator)) {
      throw new BadRequestException(
        `${contextLabel}: invalid operator '${action.operator}' for ${variable.kind} variable ${variable.id}. Allowed: ${allowedOperators.join(', ')}`
      )
    }

    const hasValue = action.value !== undefined && action.value !== null
    const hasRef = typeof action.ref === 'string' && action.ref.length > 0

    if (!hasValue && !hasRef) {
      throw new BadRequestException(`${contextLabel}: calculate action requires value or ref`)
    }

    if (hasValue) {
      if (variable.kind === 'number') {
        if (typeof action.value !== 'number' || !isFinite(action.value)) {
          throw new BadRequestException(
            `${contextLabel}: value must be a finite number for number variable ${variable.id}`
          )
        }
      } else if (typeof action.value !== 'string') {
        throw new BadRequestException(
          `${contextLabel}: value must be a string for string variable ${variable.id}`
        )
      }
    }

    if (action.ref !== undefined && action.ref !== null && !hasRef) {
      throw new BadRequestException(`${contextLabel}: ref must be a non-empty field id`)
    }

    if (hasRef) {
      const refInfo = fieldMap.get(action.ref)
      if (!refInfo) {
        throw new BadRequestException(
          `${contextLabel}: ref field ${action.ref} not found (ref must be an existing question field id)`
        )
      }
      if (!this.isQuestionKind(refInfo.field.kind)) {
        throw new BadRequestException(
          `${contextLabel}: ref field ${action.ref} is not a question field (kind ${refInfo.field.kind})`
        )
      }
      if (sourceIndex !== null && refInfo.index > sourceIndex) {
        warnings.push(
          `${contextLabel}: ref field ${action.ref} comes after the source field; its answer may be empty at evaluation time`
        )
      }
    }

    const normalized: Record<string, any> = {
      kind: ActionEnum.CALCULATE,
      variable: variable.id,
      operator: action.operator
    }

    if (hasValue) {
      normalized.value = action.value
    }

    if (hasRef) {
      normalized.ref = action.ref
    }

    return normalized
  }

  private buildVariableLogics(
    payloads: any[],
    owner: any,
    variables: any[],
    fieldMap: Map<string, { field: any; index: number }>,
    warnings: string[]
  ): any[] {
    return payloads.map(payload => {
      if (!payload || typeof payload !== 'object') {
        throw new BadRequestException(`variable '${owner.name}': logic payload must be an object`)
      }

      const id = payload.id || nanoid(8)
      const contextLabel = `variable ${owner.id} payload ${id}`

      let condition = payload.condition
      let conditions = payload.conditions
      let connector = payload.connector

      if (
        (!condition || typeof condition !== 'object') &&
        Array.isArray(conditions) &&
        conditions.length > 0
      ) {
        condition = conditions[0]
      }

      if (Array.isArray(conditions) && conditions.length > 0) {
        connector = connector === 'or' ? 'or' : 'and'
      } else {
        conditions = undefined
        connector = undefined
      }

      const maxIndex = fieldMap.size
      this.validateLogicCondition(condition, maxIndex, fieldMap, warnings, undefined, variables)

      if (conditions) {
        for (const c of conditions) {
          this.validateLogicCondition(c, maxIndex, fieldMap, warnings, undefined, variables)
        }
      }

      const action = payload.action
      if (!action || typeof action !== 'object') {
        throw new BadRequestException(`${contextLabel}: payload action is required`)
      }

      let normalizedAction: Record<string, any>

      if (action.kind === ActionEnum.CALCULATE) {
        normalizedAction = this.normalizeCalculateAction(
          action,
          variables,
          fieldMap,
          null,
          contextLabel,
          warnings
        )
      } else if (action.kind === ActionEnum.NAVIGATE) {
        const destination = fieldMap.get(action.fieldId)
        if (!destination) {
          throw new BadRequestException(
            `${contextLabel}: destination field ${action.fieldId} not found`
          )
        }
        normalizedAction = {
          kind: ActionEnum.NAVIGATE,
          fieldId: action.fieldId
        }
      } else {
        throw new BadRequestException(
          `${contextLabel}: unsupported action kind '${action.kind}'. Allowed: navigate, calculate`
        )
      }

      const normalizedPayload: Record<string, any> = {
        id,
        condition,
        action: normalizedAction
      }

      if (conditions) {
        normalizedPayload.conditions = conditions
        normalizedPayload.connector = connector
      }

      return normalizedPayload
    })
  }

  private buildVariables(
    inputs: any[],
    fields: any[],
    existingLogics: any[] | undefined,
    previousVariables: any[] | undefined,
    warnings: string[]
  ): any[] {
    const errors: string[] = []
    const flatFields = flattenFields(fields, true)
    const fieldMap = new Map<string, { field: any; index: number }>()
    flatFields.forEach((field, index) => fieldMap.set(field.id, { field, index }))

    const built: any[] = []
    const seenNames = new Set<string>()
    const seenIds = new Set<string>()
    const validInputs: any[] = []

    for (const input of inputs) {
      const name = typeof input.name === 'string' ? input.name.trim() : ''
      if (!name) {
        errors.push('variable name must be a non-empty string')
        continue
      }

      if (seenNames.has(name)) {
        errors.push(`duplicate variable name: ${name}`)
        continue
      }
      seenNames.add(name)

      const kind = input.kind
      if (kind !== 'string' && kind !== 'number') {
        errors.push(`variable '${name}': kind must be 'string' or 'number'`)
        continue
      }

      let value = input.value
      if (value === undefined || value === null) {
        value = kind === 'number' ? 0 : ''
      } else if (kind === 'number') {
        if (typeof value !== 'number' || !isFinite(value)) {
          errors.push(`variable '${name}': value must be a finite number for kind number`)
          continue
        }
      } else if (typeof value !== 'string') {
        errors.push(`variable '${name}': value must be a string for kind string`)
        continue
      }

      const id = input.id || nanoid(12)
      if (seenIds.has(id)) {
        errors.push(`duplicate variable id: ${id}`)
        continue
      }
      seenIds.add(id)

      const hasCalculateRules =
        Array.isArray(input.logics) &&
        input.logics.some((payload: any) => payload?.action?.kind === 'calculate')

      if (hasCalculateRules) {
        const note = `variable "${name}" has calculate rules in variable.logics, but they are NOT executed at runtime; define calculations in form.logics instead (update_form_logic)`
        if (!warnings.includes(note)) {
          warnings.push(note)
        }
      }

      built.push({ id, name, kind, value, logics: [] })
      validInputs.push(input)
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '))
    }

    const newIds = new Set(built.map(variable => variable.id))
    const removedIds = new Set(
      (previousVariables || []).map(variable => variable.id).filter(id => !newIds.has(id))
    )
    const removedRefs = this.findRemovedVariableReferences(
      removedIds,
      existingLogics,
      built.map((variable, index) => ({ id: variable.id, logics: validInputs[index].logics }))
    )

    if (removedRefs.length > 0) {
      throw new BadRequestException(
        `cannot remove variables referenced by calculate actions: ${removedRefs.join('; ')}`
      )
    }

    for (let index = 0; index < built.length; index++) {
      const input = validInputs[index]
      if (Array.isArray(input.logics) && input.logics.length > 0) {
        built[index].logics = this.buildVariableLogics(
          input.logics,
          built[index],
          built,
          fieldMap,
          warnings
        )
      }
    }

    return built
  }

  private buildHiddenFields(inputs: any[], warnings: string[]): any[] {
    const errors: string[] = []
    const seenNames = new Set<string>()
    const seenIds = new Set<string>()
    const hiddenFields: any[] = []

    for (const input of inputs) {
      const name = typeof input.name === 'string' ? input.name.trim() : ''
      if (!name) {
        errors.push('hidden field name must be a non-empty string')
        continue
      }

      if (seenNames.has(name)) {
        errors.push(`duplicate hidden field name: ${name}`)
        continue
      }
      seenNames.add(name)

      if (/\s/.test(name)) {
        warnings.push(`hidden field '${name}' contains whitespace; URL query keys usually do not`)
      }

      const id = input.id || nanoid(12)
      if (seenIds.has(id)) {
        errors.push(`duplicate hidden field id: ${id}`)
        continue
      }
      seenIds.add(id)

      hiddenFields.push({ id, name })
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '))
    }

    if (hiddenFields.length > 20) {
      warnings.push(
        `hidden fields count ${hiddenFields.length} exceeds the recommended limit of 20; they are stored but may be hard to manage`
      )
    }

    return hiddenFields
  }

  private findRemovedVariableReferences(
    removedIds: Set<string>,
    logics: any[] | undefined,
    variables: any[] | undefined
  ): string[] {
    if (removedIds.size === 0) {
      return []
    }

    const refs: string[] = []

    for (const rule of logics || []) {
      for (const payload of rule?.payloads || []) {
        if (
          payload?.action?.kind === ActionEnum.CALCULATE &&
          removedIds.has(payload.action.variable)
        ) {
          refs.push(
            `fieldId ${rule.fieldId} payload ${payload.id} → variable ${payload.action.variable}`
          )
        }
      }
    }

    for (const variable of variables || []) {
      for (const payload of variable?.logics || []) {
        if (
          payload?.action?.kind === ActionEnum.CALCULATE &&
          removedIds.has(payload.action.variable)
        ) {
          refs.push(
            `variable ${variable.id} payload ${payload.id} → variable ${payload.action.variable}`
          )
        }
      }
    }

    return refs
  }

  private isQuestionKind(kind: FieldKindEnum): boolean {
    const nonQuestionKinds = [
      FieldKindEnum.GROUP,
      FieldKindEnum.WELCOME,
      FieldKindEnum.THANK_YOU,
      FieldKindEnum.STATEMENT,
      FieldKindEnum.VARIABLE,
      FieldKindEnum.HIDDEN_FIELDS,
      FieldKindEnum.HIDDEN_CHECKBOX,
      FieldKindEnum.SUBMIT_DATE,
      FieldKindEnum.CUSTOM_TEXT,
      FieldKindEnum.CUSTOM_SINGLE,
      FieldKindEnum.CUSTOM_MULTIPLE,
      FieldKindEnum.CUSTOM_DATE,
      FieldKindEnum.CUSTOM_NUMBER,
      FieldKindEnum.CUSTOM_CHECKBOX
    ]
    return !nonQuestionKinds.includes(kind)
  }

  private isTextKind(kind: FieldKindEnum): boolean {
    return [
      FieldKindEnum.SHORT_TEXT,
      FieldKindEnum.LONG_TEXT,
      FieldKindEnum.EMAIL,
      FieldKindEnum.URL,
      FieldKindEnum.PHONE_NUMBER,
      FieldKindEnum.COUNTRY
    ].includes(kind)
  }

  private getAllowedComparisons(kind: FieldKindEnum): ComparisonEnum[] {
    if (kind === FieldKindEnum.STATEMENT) {
      return [ComparisonEnum.IS_EMPTY]
    }

    if (this.isTextKind(kind)) {
      return [
        ComparisonEnum.IS,
        ComparisonEnum.IS_NOT,
        ComparisonEnum.CONTAINS,
        ComparisonEnum.DOES_NOT_CONTAIN,
        ComparisonEnum.STARTS_WITH,
        ComparisonEnum.ENDS_WITH,
        ComparisonEnum.IS_EMPTY,
        ComparisonEnum.IS_NOT_EMPTY
      ]
    }

    if (kind === FieldKindEnum.MULTIPLE_CHOICE || kind === FieldKindEnum.PICTURE_CHOICE) {
      return [
        ComparisonEnum.IS,
        ComparisonEnum.IS_NOT,
        ComparisonEnum.CONTAINS,
        ComparisonEnum.DOES_NOT_CONTAIN,
        ComparisonEnum.IS_EMPTY,
        ComparisonEnum.IS_NOT_EMPTY
      ]
    }

    if (kind === FieldKindEnum.YES_NO || kind === FieldKindEnum.LEGAL_TERMS) {
      return [
        ComparisonEnum.IS,
        ComparisonEnum.IS_NOT,
        ComparisonEnum.IS_EMPTY,
        ComparisonEnum.IS_NOT_EMPTY
      ]
    }

    if (kind === FieldKindEnum.DATE) {
      return [
        ComparisonEnum.IS,
        ComparisonEnum.IS_NOT,
        ComparisonEnum.IS_BEFORE,
        ComparisonEnum.IS_AFTER,
        ComparisonEnum.IS_EMPTY,
        ComparisonEnum.IS_NOT_EMPTY
      ]
    }

    if (
      kind === FieldKindEnum.NUMBER ||
      kind === FieldKindEnum.RATING ||
      kind === FieldKindEnum.OPINION_SCALE
    ) {
      return [
        ComparisonEnum.EQUAL,
        ComparisonEnum.NOT_EQUAL,
        ComparisonEnum.GREATER_THAN,
        ComparisonEnum.LESS_THAN,
        ComparisonEnum.GREATER_OR_EQUAL_THAN,
        ComparisonEnum.LESS_OR_EQUAL_THAN,
        ComparisonEnum.IS_EMPTY,
        ComparisonEnum.IS_NOT_EMPTY
      ]
    }

    return [ComparisonEnum.IS_EMPTY, ComparisonEnum.IS_NOT_EMPTY]
  }

  private validateNavigateTarget(
    targetId: string,
    fieldMap: Map<string, { field: any; index: number }>,
    sourceFieldId: string
  ): void {
    if (!targetId) {
      throw new BadRequestException('Navigate target is required')
    }

    const targetInfo = fieldMap.get(targetId)
    if (!targetInfo) {
      throw new BadRequestException(`Navigate target ${targetId} not found`)
    }

    const targetKind = targetInfo.field?.kind
    if (
      targetKind !== FieldKindEnum.THANK_YOU &&
      targetKind !== FieldKindEnum.STATEMENT &&
      !this.isQuestionKind(targetKind)
    ) {
      throw new BadRequestException(
        `Navigate from ${sourceFieldId} to ${targetId}: destination must be a question, statement or thank_you field`
      )
    }
  }

  private assertAcyclicLogics(logics: any[]): void {
    const edges = new Map<string, string[]>()

    for (const rule of logics) {
      const targets = edges.get(rule.fieldId) || []

      for (const payload of rule.payloads || []) {
        if (payload.action?.kind === ActionEnum.NAVIGATE && payload.action.fieldId) {
          targets.push(payload.action.fieldId)
        }
      }

      if (rule.defaultNavigate?.fieldId) {
        targets.push(rule.defaultNavigate.fieldId)
      }

      edges.set(rule.fieldId, targets)
    }

    const states = new Map<string, number>()
    const stack: string[] = []

    const visit = (fieldId: string): string[] | null => {
      states.set(fieldId, 1)
      stack.push(fieldId)

      for (const targetId of edges.get(fieldId) || []) {
        const state = states.get(targetId) || 0

        if (state === 1) {
          return [...stack.slice(stack.indexOf(targetId)), targetId]
        }

        if (state === 0) {
          const cycle = visit(targetId)

          if (cycle) {
            return cycle
          }
        }
      }

      states.set(fieldId, 2)
      stack.pop()

      return null
    }

    for (const fieldId of edges.keys()) {
      if (states.get(fieldId)) {
        continue
      }

      const cycle = visit(fieldId)

      if (cycle) {
        throw new BadRequestException(`logic graph contains a cycle: ${cycle.join(' → ')}`)
      }
    }
  }

  private async listProjects(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    listProjectsSchema.parse(args)
    const [projects, forms] = await Promise.all([
      this.projectService.findAllInTeam(context.teamId),
      this.formService.findAllInTeam(context.teamId)
    ])
    const formCountMap = new Map<string, number>()
    for (const form of forms) {
      const count = formCountMap.get(form.projectId) || 0
      formCountMap.set(form.projectId, count + 1)
    }
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      icon: project.icon,
      formCount: formCountMap.get(project.id) || 0,
      createdAt: (project as any).createdAt
    }))
  }

  private async listForms(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    listFormsSchema.parse(args)
    const [forms, projects] = await Promise.all([
      this.formService.findAllInTeam(context.teamId),
      this.projectService.findAllInTeam(context.teamId)
    ])
    const projectMap = new Map(projects.map(project => [project.id, project.name]))
    const result = await Promise.all(
      forms.map(async form => ({
        id: form.id,
        name: form.name,
        projectId: form.projectId,
        projectName: projectMap.get(form.projectId) || null,
        status: form.status,
        updatedAt: (form as any).updatedAt,
        responsesCount: await this.submissionService.countInForm(form.id)
      }))
    )
    return result
  }

  private async getFormSchema(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    const { formId, source } = getFormSchemaSchema.parse(args)
    const form = await this.findFormInTeam(formId, context.teamId)
    const projects = await this.projectService.findAllInTeam(context.teamId)
    const projectMap = new Map(projects.map(project => [project.id, project.name]))
    const resolvedSource = source || 'published'
    const rawFields =
      resolvedSource === 'drafts' ? JSON.parse((form as any)._drafts || '[]') : form.fields
    const fields = flattenFields(rawFields)

    return {
      formId,
      formName: form.name,
      projectId: form.projectId,
      projectName: projectMap.get(form.projectId) || null,
      source: resolvedSource,
      fields: fields.map((field: FormField) => ({
        id: field.id,
        kind: field.kind,
        title: field.title,
        description: field.description ?? undefined,
        properties: field.properties,
        validations: field.validations
      })),
      logics: form.logics || [],
      variables: (form.variables || []).map(({ id, name, kind, value }) => ({
        id,
        name,
        kind,
        value
      })),
      hiddenFields: (form.hiddenFields || []).map(({ id, name }) => ({ id, name }))
    }
  }

  private async getFormReport(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    const { formId } = getFormReportSchema.parse(args)
    const form = await this.findFormInTeam(formId, context.teamId)
    const report = await this.formReportService.findById(formId)

    if (!report) {
      return { responses: [], note: 'No report yet, submissions may be pending' }
    }

    const fields = flattenFields(form.fields || [])
    const choiceLabelMap = new Map<string, Map<string, string>>()

    for (const field of fields) {
      if (field.properties?.choices) {
        const map = new Map<string, string>()
        for (const choice of field.properties.choices) {
          map.set(choice.id, choice.label)
        }
        map.set(OTHER_ITEM_ID, 'Other')
        choiceLabelMap.set(field.id, map)
      }
    }

    const responses = (report.responses || []).map(response => {
      const labelMap = choiceLabelMap.get(response.id)
      if (!labelMap || !Array.isArray(response.chooses)) {
        return response
      }

      return {
        ...response,
        chooses: response.chooses.map((choice: any) => ({
          ...choice,
          label: labelMap.get(choice.id) || choice.id
        }))
      }
    })

    return {
      total: report.responses?.[0]?.total ?? 0,
      responses
    }
  }

  private async listSubmissions(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    const { formId, page, limit, isCompleted } = listSubmissionsSchema.parse(args)
    await this.findFormInTeam(formId, context.teamId)

    const [total, submissions] = await Promise.all([
      this.submissionService.count({ formId }),
      this.submissionService.findAll({ formId, page, limit, isCompleted })
    ])

    return {
      total,
      page,
      limit,
      submissions: submissions.map(submission => ({
        id: submission.id,
        createdAt: (submission as any).createdAt,
        isCompleted: submission.isCompleted,
        answers: submission.answers.map(answer => ({
          id: answer.id,
          kind: answer.kind,
          value: answer.value
        }))
      }))
    }
  }

  private async getSubmissionsSummary(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    const { formId } = getSubmissionsSummarySchema.parse(args)
    await this.findFormInTeam(formId, context.teamId)

    const [total, { completed, partial }] = await Promise.all([
      this.submissionService.countInForm(formId),
      this.submissionService.countByCompletion(formId)
    ])

    const completionRate = total > 0 ? parseFloat(((completed / total) * 100).toFixed(2)) : 0

    return {
      total,
      completed,
      incomplete: partial,
      completionRate
    }
  }

  private async createForm(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const {
      name,
      projectId,
      fields: inputFields,
      logics: inputLogics,
      variables: inputVariables,
      hiddenFields: inputHiddenFields
    } = createFormSchema.parse(args)

    let drafts: any[]
    let buildWarnings: string[] = []

    if (inputFields) {
      const built = this.buildFormFields(inputFields)
      drafts = built.fields
      buildWarnings = built.warnings
    } else {
      drafts = [
        {
          id: nanoid(12),
          title: null,
          description: null,
          kind: FieldKindEnum.SHORT_TEXT,
          validations: { required: false },
          layout: {
            mediaType: 'image',
            mediaUrl:
              'https://images.unsplash.com/photo-1646013532943-d5b86e8689b8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1080&q=80',
            align: 'split_right',
            brightness: 0
          }
        },
        {
          id: nanoid(12),
          title: ['Thank you!'],
          description: ['Thanks for completing this form. Now create your own form.'],
          kind: FieldKindEnum.THANK_YOU
        }
      ]
    }

    let normalizedVariables: any[] | undefined
    if (inputVariables) {
      normalizedVariables = this.buildVariables(
        inputVariables,
        drafts,
        undefined,
        undefined,
        buildWarnings
      )
    }

    let normalizedHiddenFields: any[] | undefined
    if (inputHiddenFields) {
      normalizedHiddenFields = this.buildHiddenFields(inputHiddenFields, buildWarnings)
    }

    let normalizedLogics: any[] | undefined
    if (inputLogics) {
      normalizedLogics = this.validateAndNormalizeLogics(
        inputLogics,
        drafts,
        buildWarnings,
        normalizedVariables || []
      )
    }

    const projects = await this.projectService.findAllInTeam(context.teamId)
    const resolvedProjectId = projectId
      ? projects.find(project => project.id === projectId)?.id
      : projects[0]?.id

    if (!resolvedProjectId) {
      throw new Error('Project not found in workspace')
    }

    const formId = await this.formService.create({
      id: nanoid(12),
      teamId: context.teamId,
      projectId: resolvedProjectId,
      memberId: context.userId,
      name,
      kind: 1,
      interactiveMode: 1,
      fields: [],
      _drafts: JSON.stringify(drafts),
      fieldsUpdatedAt: 0,
      settings: {
        active: false,
        captchaKind: 0,
        filterSpam: false,
        allowArchive: true,
        requirePassword: false,
        locale: 'en',
        enableQuestionList: true,
        enableNavigationArrows: true,
        enableEmailNotification: true
      },
      hiddenFields: normalizedHiddenFields || [],
      logics: normalizedLogics,
      variables: normalizedVariables,
      version: 0,
      status: FormStatusEnum.NORMAL
    })

    const result: Record<string, any> = { id: formId, name }

    if (inputFields) {
      result.fieldsCount = drafts.length
    }

    if (normalizedLogics) {
      result.rulesCount = normalizedLogics.length
    }

    if (normalizedVariables) {
      result.variables = normalizedVariables
    }

    if (normalizedHiddenFields) {
      result.hiddenFields = normalizedHiddenFields
    }

    if (buildWarnings.length > 0) {
      result.warnings = buildWarnings
    }

    return result
  }

  private async submitResponse(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const { formId, answers, hiddenFields: inputHiddenFields } = submitResponseSchema.parse(args)
    const form = await this.findFormInTeam(formId, context.teamId)

    if (form.suspended) {
      throw new Error('The form is suspended')
    }

    if (form.settings?.active !== true) {
      throw new Error('The form is not active')
    }

    const fieldKindMap = new Map<string, FieldKindEnum>()
    for (const field of flattenFields(form.fields, true)) {
      fieldKindMap.set(field.id, field.kind)
    }

    const answerMap: Record<string, any> = {}
    for (const answer of answers) {
      const kind = fieldKindMap.get(answer.id)
      let value = answer.value
      if (kind && CHOICES_FIELD_KINDS.includes(kind) && Array.isArray(value)) {
        value = { value }
      }
      answerMap[answer.id] = value
    }

    let processedAnswers: any[] = []
    let computedVariables: any[] = []

    try {
      const { fields, variables: variableValues } = applyLogicToFields(
        flattenFields(form.fields, true),
        form.logics,
        form.variables,
        answerMap
      )
      processedAnswers = fieldValuesToAnswers(fields, answerMap, false)
      computedVariables = (form.variables || []).map(variable => ({
        ...variable,
        value: (variableValues as Record<string, any>)[variable.id]
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid answers'
      throw new Error(message)
    }

    const warnings: string[] = []
    const declaredHiddenFields = form.hiddenFields || []
    const providedHiddenFields = inputHiddenFields || {}
    const declaredHiddenNames = new Set(declaredHiddenFields.map(field => field.name))

    for (const key of Object.keys(providedHiddenFields)) {
      if (!declaredHiddenNames.has(key)) {
        warnings.push(`unknown hidden field: ${key}`)
      }
    }

    const computedHiddenFields = declaredHiddenFields.map(field => ({
      id: field.id,
      name: field.name,
      value: String(providedHiddenFields[field.name] ?? '')
    }))

    const acceptedFieldIds = processedAnswers.map(answer => answer.id)
    const endAt = timestamp()

    const submissionId = await this.submissionService.create({
      teamId: form.teamId,
      formId: form.id,
      category: SubmissionCategoryEnum.INBOX,
      title: form.name,
      answers: processedAnswers,
      hiddenFields: computedHiddenFields,
      variables: computedVariables,
      startAt: endAt,
      endAt,
      ip: '',
      userAgent: parseUserAgent(''),
      status:
        form.settings?.allowArchive === false
          ? SubmissionStatusEnum.PRIVATE
          : SubmissionStatusEnum.PUBLIC,
      isCompleted: true
    })

    this.formReportService.addQueue(form.id)

    return {
      submissionId,
      acceptedFields: acceptedFieldIds,
      variables: computedVariables,
      hiddenFields: computedHiddenFields,
      warnings
    }
  }

  private async updateFormStatus(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const { formId, status } = updateFormStatusSchema.parse(args)
    await this.findFormInTeam(formId, context.teamId)

    await this.formService.update(formId, { status })

    return { id: formId, status }
  }

  private async updateFormFields(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const { formId, fields } = updateFormFieldsSchema.parse(args)
    const form = await this.findFormInTeam(formId, context.teamId)

    const existingDrafts = JSON.parse((form as any)._drafts || '[]')
    const validated = this.buildFormFields(fields, existingDrafts)
    await this.formService.update(formId, { _drafts: JSON.stringify(validated.fields) })

    return { id: formId, fieldsCount: validated.fields.length, warnings: validated.warnings }
  }

  private async updateFormField(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const input = updateFormFieldSchema.parse(args)
    const { formId, fieldId } = input
    const form = await this.findFormInTeam(formId, context.teamId)

    const drafts = JSON.parse((form as any)._drafts || '[]')
    const index = drafts.findIndex((f: any) => f.id === fieldId)
    if (index < 0) {
      throw new Error('Field not found')
    }

    const field = { ...drafts[index] }
    const warnings: string[] = []

    if (input.title !== undefined) {
      field.title = input.title
    }

    if (input.description !== undefined) {
      field.description = input.description
    }

    if (input.properties !== undefined) {
      const mergedProperties = { ...field.properties, ...input.properties }
      const whitelisted: Record<string, any> = {}
      for (const key of Object.keys(mergedProperties)) {
        if (ALLOWED_PROPERTY_KEYS.includes(key)) {
          whitelisted[key] = mergedProperties[key]
        } else {
          warnings.push(`dropped unknown property '${key}'`)
        }
      }

      if (whitelisted.choices && Array.isArray(whitelisted.choices)) {
        whitelisted.choices = whitelisted.choices.map((choice: any) => ({
          ...choice,
          id: choice.id || nanoid(12)
        }))
      }

      field.properties = whitelisted
    }

    if (input.validations !== undefined) {
      field.validations = { ...field.validations, ...input.validations }
    }

    const updatedDrafts = [...drafts]
    updatedDrafts[index] = field

    await this.formService.update(formId, { _drafts: JSON.stringify(updatedDrafts) })

    return { id: formId, fieldId, warnings: warnings.length ? warnings : [] }
  }

  private async updateFormLogic(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const { formId, logics } = updateFormLogicSchema.parse(args)
    const form = await this.findFormInTeam(formId, context.teamId)

    const drafts = JSON.parse((form as any)._drafts || '[]')
    const warnings: string[] = []
    const normalizedLogics = this.validateAndNormalizeLogics(
      logics,
      drafts,
      warnings,
      form.variables || []
    )

    await this.formService.update(formId, {
      _drafts: JSON.stringify(drafts),
      logics: normalizedLogics
    })

    return { formId, rulesCount: normalizedLogics.length, warnings }
  }

  private async updateFormVariables(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const { formId, variables } = updateFormVariablesSchema.parse(args)
    const form = await this.findFormInTeam(formId, context.teamId)

    const fields = this.getEditableFields(form)
    const warnings: string[] = []
    const normalizedVariables = this.buildVariables(
      variables,
      fields,
      form.logics,
      form.variables,
      warnings
    )

    await this.formService.update(formId, { variables: normalizedVariables })

    return { formId, variables: normalizedVariables, warnings }
  }

  private async updateFormHiddenFields(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const { formId, hiddenFields } = updateFormHiddenFieldsSchema.parse(args)
    await this.findFormInTeam(formId, context.teamId)

    const warnings: string[] = []
    const normalizedHiddenFields = this.buildHiddenFields(hiddenFields, warnings)

    await this.formService.update(formId, { hiddenFields: normalizedHiddenFields })

    return { formId, hiddenFields: normalizedHiddenFields, warnings }
  }

  private async publishForm(
    args: Record<string, any>,
    context: ToolContext
  ): Promise<Record<string, any>> {
    this.requireWriteScope(context.tokenScope)
    const { formId } = publishFormSchema.parse(args)
    const form = await this.findFormInTeam(formId, context.teamId)

    const drafts = JSON.parse((form as any)._drafts || '[]')

    if (!Array.isArray(drafts) || drafts.length === 0) {
      throw new Error('Form has no draft fields')
    }

    const updates: Record<string, any> = {
      fields: drafts,
      _drafts: JSON.stringify(drafts),
      fieldsUpdatedAt: timestamp(),
      version: form.version + 1,
      'settings.active': true
    }

    if (!form.publishedAt) {
      updates.publishedAt = updates.fieldsUpdatedAt
    }

    await this.formService.update(formId, updates)

    return { id: formId, published: true }
  }
}

class McpError extends Error {
  constructor(
    public readonly code: number,
    message: string
  ) {
    super(message)
  }
}
