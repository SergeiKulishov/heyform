import { flattenFieldsWithGroups } from '@voxly/form-renderer'
import {
  ActionEnum,
  Choice,
  ComparisonEnum,
  FieldKindEnum,
  Logic,
  LogicCondition,
  LogicPayload,
  OTHER_ITEM_ID,
  UNSELECTABLE_FIELD_KINDS
} from '@voxly/shared-types-enums'
import * as dagre from 'dagre'
import { Edge, Node } from 'react-flow-renderer'

import { nanoid } from '@voxly/utils'

import { FormFieldType } from '@/types'

const nodeWidth = 224
const nodeHeight = 112

export function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  dagreGraph.setGraph({
    rankdir: direction
  })

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  let prevThankYouNode: Node | undefined = undefined

  nodes.forEach(node => {
    const position = dagreGraph.node(node.id)

    node.position = {
      x: position.x - nodeWidth / 2,
      y: position.y - nodeHeight / 2
    }

    if (node.data.field.kind === FieldKindEnum.THANK_YOU) {
      if (prevThankYouNode) {
        node.position = {
          x: prevThankYouNode.position.x,
          y: prevThankYouNode.position.y + nodeHeight + 24
        }
      }

      prevThankYouNode = node
    }

    return node
  })

  return { nodes, edges }
}

export function getDefaultCondition(
  kind?: FieldKindEnum,
  choices: Choice[] = [],
  allowMultiple = false
): LogicCondition {
  let comparison: ComparisonEnum | string = ComparisonEnum.IS_NOT_EMPTY
  let expected: any

  switch (kind) {
    case FieldKindEnum.SHORT_TEXT:
    case FieldKindEnum.LONG_TEXT:
    case FieldKindEnum.EMAIL:
    case FieldKindEnum.PHONE_NUMBER:
    case FieldKindEnum.URL:
    case FieldKindEnum.YES_NO:
    case FieldKindEnum.LEGAL_TERMS:
    case FieldKindEnum.DATE:
    case FieldKindEnum.MULTIPLE_CHOICE:
    case FieldKindEnum.PICTURE_CHOICE:
      comparison = ComparisonEnum.IS
      break

    case FieldKindEnum.NUMBER:
    case FieldKindEnum.RATING:
    case FieldKindEnum.OPINION_SCALE:
      comparison = ComparisonEnum.EQUAL
      break

    default:
      comparison = ComparisonEnum.IS_NOT_EMPTY
      break
  }

  if (FieldKindEnum.LEGAL_TERMS === kind) {
    expected = true
  } else if (FieldKindEnum.YES_NO === kind) {
    expected = choices[0]?.id
  } else if (FieldKindEnum.MULTIPLE_CHOICE === kind || FieldKindEnum.PICTURE_CHOICE === kind) {
    expected = allowMultiple ? [choices[0]?.id] : choices[0]?.id
  }

  return { comparison: comparison as ComparisonEnum, expected } as LogicCondition
}

export function getLogicPayload(
  kind?: FieldKindEnum,
  choices: Choice[] = [],
  allowMultiple = false
): LogicPayload {
  return {
    id: nanoid(12),
    condition: getDefaultCondition(kind, choices, allowMultiple),
    action: {
      kind: ActionEnum.NAVIGATE
    }
  } as LogicPayload
}

export function getChoiceCoverage(
  field: FormFieldType,
  payloads: LogicPayload[]
): { covered: number; total: number } | null {
  const coverageKinds = [
    FieldKindEnum.MULTIPLE_CHOICE,
    FieldKindEnum.PICTURE_CHOICE,
    FieldKindEnum.YES_NO
  ]

  if (!coverageKinds.includes(field.kind)) {
    return null
  }

  const choices = field.properties?.choices || []
  const allowOther = !!field.properties?.allowOther && field.kind !== FieldKindEnum.YES_NO
  const total = (field.kind === FieldKindEnum.YES_NO ? 2 : choices.length) + (allowOther ? 1 : 0)

  if (total === 0) {
    return null
  }

  const choiceIds = new Set(choices.map(choice => choice.id))

  if (allowOther) {
    choiceIds.add(OTHER_ITEM_ID)
  }
  const coveredIds = new Set<string>()

  payloads.forEach(payload => {
    const conditions = payload.conditions?.length ? payload.conditions : [payload.condition]

    conditions.forEach(condition => {
      const comparison = condition?.comparison

      if (comparison !== 'is' && comparison !== 'contains') {
        return
      }

      const expected = condition?.expected
      const values = (Array.isArray(expected) ? expected : [expected]).filter(
        (value): value is string => typeof value === 'string'
      )

      values.forEach(value => {
        if (choiceIds.has(value)) {
          coveredIds.add(value)
        }
      })
    })
  })

  return {
    covered: coveredIds.size,
    total
  }
}

export function getValidLogics(fields: FormFieldType[], logics?: Logic[]): Logic[] {
  const fieldIds = flattenFieldsWithGroups(fields).map(f => f.id)
  return logics?.filter(l => fieldIds.includes(l.fieldId)) || []
}

export function findBrokenNavigatePayloadIds(
  fields: FormFieldType[],
  logics?: Logic[]
): Set<string> {
  const flattened = flattenFieldsWithGroups(fields)
  const indexMap = new Map<string, number>()

  flattened.forEach((field, index) => {
    indexMap.set(field.id, index)
  })

  const brokenIds = new Set<string>()

  logics?.forEach(logic => {
    const sourceIndex = indexMap.get(logic.fieldId)

    if (sourceIndex === undefined) {
      return
    }

    logic.payloads.forEach(payload => {
      if (payload.action.kind !== ActionEnum.NAVIGATE) {
        return
      }

      const targetId = payload.action.fieldId
      const targetIndex = indexMap.get(targetId)

      if (targetIndex === undefined || targetIndex <= sourceIndex) {
        brokenIds.add(payload.id)
      }
    })
  })

  return brokenIds
}

export function sanitizeLogics(fields: FormFieldType[], logics?: Logic[]): Logic[] {
  const flattened = flattenFieldsWithGroups(fields)
  const fieldIds = new Set(flattened.map(f => f.id))

  let hasChanges = false

  const sanitized = logics?.reduce<Logic[]>((result, logic) => {
    const payloads = logic.payloads.filter(payload => {
      if (payload.action.kind !== ActionEnum.NAVIGATE) {
        return true
      }

      const isValid = fieldIds.has(payload.action.fieldId)

      if (!isValid) {
        hasChanges = true
      }

      return isValid
    })

    if (payloads.length !== logic.payloads.length) {
      hasChanges = true
    }

    let defaultNavigate = logic.defaultNavigate

    if (defaultNavigate?.fieldId && !fieldIds.has(defaultNavigate.fieldId)) {
      defaultNavigate = undefined
      hasChanges = true
    }

    if (payloads.length > 0 || defaultNavigate) {
      if (hasChanges) {
        result.push({
          ...logic,
          payloads,
          defaultNavigate
        })
      } else {
        result.push(logic)
      }
    } else {
      hasChanges = true
    }

    return result
  }, [])

  if (!hasChanges) {
    return logics || []
  }

  return sanitized || []
}

export function removePayloadFromLogics(
  logics: Logic[],
  fieldId: string,
  payloadId: string
): Logic[] {
  return logics
    .map(logic =>
      logic.fieldId === fieldId
        ? { ...logic, payloads: logic.payloads.filter(p => p.id !== payloadId) }
        : logic
    )
    .filter(logic => logic.payloads.length > 0 || !!logic.defaultNavigate?.fieldId)
}

export function fieldLogicToNodesEdges(
  rawFields: FormFieldType[],
  logics?: Logic[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const fields = flattenFieldsWithGroups(rawFields)
  const indexMap = new Map<string, number>()

  const logicsMap = new Map<string, Logic>()
  logics?.forEach(logic => logicsMap.set(logic.fieldId, logic))
  const fieldIdSet = new Set(fields.map(f => f.id))

  fields.forEach((field, index) => {
    indexMap.set(field.id, index)

    nodes.push({
      id: field.id,
      type: 'customNode',
      data: {
        field,
        isFirstField: index === 0,
        isLastField: index === fields.length - 1
      },
      position: {
        x: 0,
        y: 0
      },
      connectable: true,
      selectable: !UNSELECTABLE_FIELD_KINDS.includes(field.kind)
    })

    if (index < fields.length - 1) {
      const nextField = fields[index + 1]
      const logic = logicsMap.get(field.id)
      const hasNavigate = (logic?.payloads || []).some(p => p.action.kind === ActionEnum.NAVIGATE)
      const defaultTargetId = logic?.defaultNavigate?.fieldId
      const hasDefault = !!defaultTargetId && fieldIdSet.has(defaultTargetId)

      let drawSequential = true
      let isFallback = false

      if (hasDefault) {
        drawSequential = false
      } else if (hasNavigate) {
        const coverage = getChoiceCoverage(field, logic!.payloads)

        if (coverage && coverage.covered >= coverage.total) {
          drawSequential = false
        } else {
          isFallback = true
        }
      }

      if (drawSequential) {
        edges.push({
          id: `${field.id}-${nextField.id}`,
          source: field.id,
          target: nextField.id,
          style: isFallback
            ? {
                stroke: 'rgba(var(--hf-secondary), 0.45)',
                strokeWidth: 1.5,
                strokeDasharray: '4 4'
              }
            : {
                stroke: 'rgba(var(--hf-secondary))'
              },
          markerEnd: 'edge-marker-arrow'
        })
      }
    }
  })

  logics?.forEach(logic => {
    const { fieldId, payloads } = logic
    const sourceIndex = indexMap.get(fieldId)
    const sourceField = fields.find(field => field.id === fieldId)

    payloads.forEach(payload => {
      if (payload.action.kind === ActionEnum.NAVIGATE) {
        const targetId = payload.action.fieldId
        const targetIndex = indexMap.get(targetId)
        const isBroken = targetIndex === undefined
        const isBackward = !isBroken && targetIndex <= sourceIndex!

        edges.push({
          type: 'customEdge',
          id: payload.id,
          source: fieldId,
          target: targetId,
          style: {
            stroke: isBroken ? '#ef4444' : 'rgba(var(--hf-secondary))',
            strokeDasharray: isBackward ? '6 4' : undefined
          },
          markerEnd: 'edge-marker-arrow',
          data: {
            payload,
            sourceField
          }
        })
      }
    })

    if (logic.defaultNavigate?.fieldId) {
      const targetId = logic.defaultNavigate.fieldId
      const targetIndex = indexMap.get(targetId)

      if (targetIndex !== undefined) {
        edges.push({
          type: 'customEdge',
          id: `default-${fieldId}`,
          source: fieldId,
          target: targetId,
          style: {
            stroke: 'rgba(var(--hf-secondary), 0.5)',
            strokeWidth: 1.5
          },
          markerEnd: 'edge-marker-arrow',
          data: {
            payload: undefined,
            sourceField,
            isDefault: true
          }
        })
      }
    }
  })

  return getLayoutedElements(nodes, edges)
}
