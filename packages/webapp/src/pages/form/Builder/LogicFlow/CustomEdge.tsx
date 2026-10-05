import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { EdgeProps, EdgeText, getBezierEdgeCenter, getBezierPath } from 'react-flow-renderer'
import { useTranslation } from 'react-i18next'

import { htmlUtils } from '@voxly/answer-utils'
import { helper } from '@voxly/utils'

import {
  DATE_CONDITIONS,
  DEFAULT_COMPARISONS,
  MULTIPLE_CHOICE_CONDITIONS,
  NUMBER_CONDITIONS,
  SINGLE_CHOICE_CONDITIONS,
  TEXT_CONDITIONS
} from '@/consts'
import { FormFieldType } from '@/types'

const CustomEdgeComponent: FC<EdgeProps> = ({
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

  if (!label) {
    return <path d={edgePath} markerEnd={markerEnd} style={style} />
  }

  return (
    <>
      <path d={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeText
        x={labelX}
        y={labelY}
        label={label}
        className="text-secondary rounded border border-gray-200 bg-white px-1.5 text-xs"
      />
    </>
  )
}

export const CustomEdge = memo(CustomEdgeComponent)
