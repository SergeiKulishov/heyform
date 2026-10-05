import { flattenFieldsWithGroups } from '@voxly/form-renderer'
import {
  ActionEnum,
  FieldKindEnum,
  Logic,
  UNSELECTABLE_FIELD_KINDS
} from '@voxly/shared-types-enums'
import * as dagre from 'dagre'
import { Edge, Node } from 'react-flow-renderer'

import { FormFieldType } from '@/types'

const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const nodeWidth = 224
const nodeHeight = 112

export function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'LR') {
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

export function fieldLogicToNodesEdges(
  rawFields: FormFieldType[],
  logics?: Logic[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const fields = flattenFieldsWithGroups(rawFields)
  const indexMap = new Map<string, number>()

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
      const fieldId = field.id
      const targetId = nextField.id

      edges.push({
        id: `${fieldId}-${targetId}`,
        source: fieldId,
        target: targetId,
        style: {
          stroke: 'rgba(var(--hf-secondary))'
        },
        markerEnd: 'edge-marker-arrow'
      })
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
            stroke: 'rgba(var(--hf-secondary))',
            strokeDasharray: '2 3'
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
