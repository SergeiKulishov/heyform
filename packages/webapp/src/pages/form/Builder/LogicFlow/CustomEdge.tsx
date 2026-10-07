import { OTHER_ITEM_ID } from '@voxly/shared-types-enums'
import type { FC, MouseEvent as ReactMouseEvent } from 'react'
import { memo, useMemo } from 'react'
import { EdgeProps, EdgeText, getBezierEdgeCenter, getBezierPath } from 'react-flow-renderer'
import { useTranslation } from 'react-i18next'

import { removePayloadFromLogics } from '../utils'
import { htmlUtils } from '@voxly/answer-utils'
import { helper } from '@voxly/utils'

import { useToast } from '@/components'
import {
  DATE_CONDITIONS,
  DEFAULT_COMPARISONS,
  MULTIPLE_CHOICE_CONDITIONS,
  NUMBER_CONDITIONS,
  SINGLE_CHOICE_CONDITIONS,
  TEXT_CONDITIONS
} from '@/consts'
import { FormFieldType } from '@/types'

import { useStoreContext } from '../store'

const CustomEdgeComponent: FC<EdgeProps> = ({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data
}) => {
  const { t } = useTranslation()
  const { state, dispatch } = useStoreContext()
  const toast = useToast()
  const edgePath = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })
  const [labelX, labelY] = getBezierEdgeCenter({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })

  const label = useMemo(() => {
    const payload = data?.payload
    const sourceField: FormFieldType | undefined = data?.sourceField
    const isDefault = data?.isDefault

    if (isDefault) {
      return t('form.builder.logic.rule.otherwise')
    }

    const condition = payload?.conditions?.[0] ?? payload?.condition

    if (!condition) {
      return ''
    }

    const comparisonMap: Record<string, string> = {}
    ;[
      ...SINGLE_CHOICE_CONDITIONS,
      ...MULTIPLE_CHOICE_CONDITIONS,
      ...TEXT_CONDITIONS,
      ...DATE_CONDITIONS,
      ...NUMBER_CONDITIONS,
      ...DEFAULT_COMPARISONS
    ].forEach(option => {
      comparisonMap[String(option.value)] = option.label as string
    })

    const comparison = condition.comparison
    const comparisonLabel = comparisonMap[String(comparison)]
      ? t(comparisonMap[String(comparison)])
      : ''

    if (comparison === 'is_empty' || comparison === 'is_not_empty') {
      return comparisonLabel
    }

    const choices = sourceField?.properties?.choices

    function getExpectedLabel(value: any): string {
      if (!helper.isValid(value)) {
        return ''
      }

      const matchedChoice = choices?.find((choice: any) => choice.id === value)
      if (matchedChoice) {
        return htmlUtils.plain(matchedChoice.label as string)
      }

      if (value === OTHER_ITEM_ID) {
        return sourceField?.properties?.otherChoiceLabel || t('form.builder.compose.otherChoice')
      }

      if (value === true) {
        return t('form.builder.logic.rule.true')
      }

      if (value === false) {
        return t('form.builder.logic.rule.false')
      }

      return String(value)
    }

    const expected = condition.expected
    let expectedLabel = ''

    if (Array.isArray(expected)) {
      expectedLabel = expected.map(getExpectedLabel).filter(Boolean).join(', ')
    } else {
      expectedLabel = getExpectedLabel(expected)
    }

    const baseLabel = `${comparisonLabel} ${expectedLabel}`.trim()
    const extraCount = (payload?.conditions?.length || 0) - 1

    if (extraCount > 0) {
      return `${baseLabel} +${extraCount}`
    }

    return baseLabel
  }, [data, t])

  const displayLabel = label.length > 24 ? `${label.slice(0, 23)}…` : label

  function handleDeleteClick(event: ReactMouseEvent<SVGGElement>) {
    event.stopPropagation()

    dispatch({
      type: 'setLogics',
      payload: removePayloadFromLogics(state.logics || [], source, id)
    })
    toast({
      title: t('form.builder.logic.flow.connect.ruleDeleted.title'),
      message: t('form.builder.logic.flow.connect.ruleDeleted.description')
    })
  }

  if (!label) {
    return <path d={edgePath} markerEnd={markerEnd} style={style} fill="none" />
  }

  return (
    <g>
      <title>{label}</title>
      <path d={edgePath} markerEnd={markerEnd} style={style} fill="none" />
      <EdgeText
        x={labelX}
        y={labelY}
        label={displayLabel}
        className="text-secondary rounded border border-gray-200 bg-white px-1.5 text-xs"
      />
      {data?.payload && (
        <g className="edge-delete-button cursor-pointer" onClick={handleDeleteClick}>
          <title>{t('form.builder.logic.rule.deleteRule')}</title>
          <circle
            cx={targetX - 16}
            cy={targetY - 14}
            r={9}
            className="fill-white stroke-gray-300"
            strokeWidth={1}
          />
          <path
            d={`M${targetX - 20} ${targetY - 18} L${targetX - 12} ${targetY - 10} M${targetX - 12} ${targetY - 18} L${targetX - 20} ${targetY - 10}`}
            className="stroke-gray-500"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}
    </g>
  )
}

export const CustomEdge = memo(CustomEdgeComponent)
