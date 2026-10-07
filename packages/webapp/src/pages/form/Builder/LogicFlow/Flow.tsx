import { flattenFieldsWithGroups } from '@voxly/form-renderer'
import { ActionEnum, FieldKindEnum, UNSELECTABLE_FIELD_KINDS } from '@voxly/shared-types-enums'
import { useEffect, useMemo } from 'react'
import ReactFlow, {
  Connection,
  ConnectionLineType,
  Controls,
  Edge,
  EdgeChange,
  Node,
  useEdgesState,
  useNodesState,
  useReactFlow
} from 'react-flow-renderer'
import { useTranslation } from 'react-i18next'

import { fieldLogicToNodesEdges, getLogicPayload, removePayloadFromLogics } from '../utils'

import { useToast } from '@/components'
import { useAppStore } from '@/store'

import { useStoreContext } from '../store'
import { ConnectionLine } from './ConnectionLine'
import { CustomEdge } from './CustomEdge'
import { CustomNode } from './CustomNode'

const snapGrid: [number, number] = [16, 16]
const nodeTypes = {
  customNode: CustomNode
}
const edgeTypes = {
  customEdge: CustomEdge
}

export const Flow = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const { openModal } = useAppStore()
  const { state, dispatch } = useStoreContext()
  const flow = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const flatFields = useMemo(() => flattenFieldsWithGroups(state.fields), [state.fields])
  const fieldIndexMap = useMemo(() => {
    const m = new Map<string, number>()
    flatFields.forEach((f, i) => m.set(f.id, i))
    return m
  }, [flatFields])

  function handleInit() {
    setTimeout(() => {
      flow.zoomTo(1, {
        duration: 500
      })
    }, 100)
  }

  function handleNodeClick(_: unknown, node: Node) {
    const { field } = node.data

    if (!UNSELECTABLE_FIELD_KINDS.includes(field.kind)) {
      openModal('LogicModal')
      dispatch({
        type: 'selectField',
        payload: {
          id: field.id,
          parentId: field.parent?.id
        }
      })
    }
  }

  function validateConnection(connection: Connection): 'ok' | 'backward' | 'invalid' {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return 'invalid'
    }

    const sourceField = flatFields.find(f => f.id === connection.source)
    const targetField = flatFields.find(f => f.id === connection.target)

    if (!sourceField || !targetField) {
      return 'invalid'
    }

    if (
      sourceField.kind === FieldKindEnum.WELCOME ||
      sourceField.kind === FieldKindEnum.THANK_YOU ||
      targetField.kind === FieldKindEnum.WELCOME
    ) {
      return 'invalid'
    }

    const sourceIndex = fieldIndexMap.get(connection.source)!
    const targetIndex = fieldIndexMap.get(connection.target)!

    if (targetIndex <= sourceIndex) {
      return 'backward'
    }

    return 'ok'
  }

  function isConnectTargetValid(sourceId: string, targetId: string): boolean {
    if (targetId === sourceId) {
      return false
    }

    const targetField = flatFields.find(f => f.id === targetId)

    if (!targetField || targetField.kind === FieldKindEnum.WELCOME) {
      return false
    }

    const sourceIndex = fieldIndexMap.get(sourceId)
    const targetIndex = fieldIndexMap.get(targetId)

    return sourceIndex !== undefined && targetIndex !== undefined && targetIndex > sourceIndex
  }

  function handleConnectStart(
    _: unknown,
    {
      nodeId,
      handleType
    }: { nodeId: string | null; handleId: string | null; handleType: string | null }
  ) {
    if (handleType !== 'source' || !nodeId) {
      return
    }

    setNodes(ns =>
      ns.map(n => ({
        ...n,
        className: isConnectTargetValid(nodeId, n.id) ? 'flow-node-valid-target' : ''
      }))
    )
  }

  function handleConnectEnd() {
    setNodes(ns => ns.map(n => ({ ...n, className: '' })))
  }

  function selectSourceField(fieldId: string) {
    const sourceField = flatFields.find(f => f.id === fieldId)
    const parent = state.fields.find(
      f => f.kind === FieldKindEnum.GROUP && f.properties?.fields?.some(c => c.id === fieldId)
    )

    dispatch({
      type: 'selectField',
      payload: {
        id: fieldId,
        parentId: parent?.id
      }
    })

    return sourceField
  }

  function handleConnect(connection: Connection) {
    const validity = validateConnection(connection)

    if (validity !== 'ok') {
      const key =
        validity === 'backward'
          ? 'form.builder.logic.flow.connect.backwardJump'
          : 'form.builder.logic.flow.connect.invalid'

      toast({
        title: t(`${key}.title`),
        message: t(`${key}.description`)
      })
      return
    }

    const sourceField = selectSourceField(connection.source as string)!
    const existingLogic = state.logics?.find(l => l.fieldId === sourceField.id)
    const hasNavigatePayloads = !!existingLogic?.payloads?.some(
      p => p.action.kind === ActionEnum.NAVIGATE
    )

    if (!hasNavigatePayloads) {
      dispatch({
        type: 'setLogic',
        payload: {
          fieldId: sourceField.id,
          payloads: existingLogic?.payloads || [],
          defaultNavigate: {
            fieldId: connection.target as string
          }
        }
      })
      toast({
        title: t('form.builder.logic.flow.connect.elseCreated.title'),
        message: t('form.builder.logic.flow.connect.elseCreated.description')
      })
      return
    }

    const draft = getLogicPayload(
      sourceField.kind,
      sourceField.properties?.choices,
      sourceField.properties?.allowMultiple
    )

    draft.action = {
      kind: ActionEnum.NAVIGATE,
      fieldId: connection.target as string
    }

    dispatch({
      type: 'setDraftPayload',
      payload: {
        fieldId: sourceField.id,
        payload: draft
      }
    })
    openModal('LogicModal')
  }

  function handleEdgeClick(_: unknown, edge: Edge) {
    if (edge.type !== 'customEdge') {
      return
    }

    selectSourceField(edge.source)

    if (edge.data?.payload?.id) {
      dispatch({
        type: 'setFocusPayload',
        payload: {
          payloadId: edge.data.payload.id
        }
      })
    }

    openModal('LogicModal')
  }

  function handleEdgesChange(changes: EdgeChange[]) {
    const removals = changes.filter(c => c.type === 'remove')
    const allowed = changes.filter(c => {
      if (c.type !== 'remove') {
        return true
      }

      const edge = edges.find(e => e.id === c.id)

      return !!edge?.data?.payload
    })
    let removedCount = 0

    removals.forEach(change => {
      const edge = edges.find(e => e.id === change.id)

      if (!edge?.data?.payload) {
        return
      }

      dispatch({
        type: 'setLogics',
        payload: removePayloadFromLogics(state.logics || [], edge.source, edge.id)
      })
      removedCount++
    })

    if (removedCount > 0) {
      toast({
        title: t('form.builder.logic.flow.connect.ruleDeleted.title'),
        message: t('form.builder.logic.flow.connect.ruleDeleted.description')
      })
    }

    onEdgesChange(allowed)
  }

  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = fieldLogicToNodesEdges(
      state.fields,
      state.logics
    )
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [setEdges, setNodes, state.fields, state.logics])

  return (
    <ReactFlow
      nodeTypes={nodeTypes as Any}
      edgeTypes={edgeTypes as Any}
      nodes={nodes}
      edges={edges}
      connectionLineType={ConnectionLineType.SimpleBezier}
      connectionLineComponent={ConnectionLine}
      snapGrid={snapGrid}
      snapToGrid={true}
      fitView={true}
      fitViewOptions={{ duration: 0 }}
      proOptions={{
        account: 'paid-custom',
        hideAttribution: true
      }}
      onNodesChange={onNodesChange}
      onEdgesChange={handleEdgesChange}
      onEdgeClick={handleEdgeClick}
      onInit={handleInit}
      onNodeClick={handleNodeClick}
      onConnect={handleConnect}
      onConnectStart={handleConnectStart}
      onConnectEnd={handleConnectEnd}
      deleteKeyCode={['Backspace', 'Delete']}
    >
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
