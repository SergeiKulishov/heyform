import type { Choice, RankingValue } from '@voxly/shared-types-enums'
import clsx from 'clsx'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { helper } from '@voxly/utils'

import { IComponentProps } from '../typings'

interface RankingInputProps extends Omit<IComponentProps, 'onChange' | 'value'> {
  value?: RankingValue
  choices?: Choice[]
  onChange?: (value: RankingValue) => void
}

export const RankingInput: FC<RankingInputProps> = ({ value, choices, onChange, ...restProps }) => {
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    if (helper.isValidArray(value?.value)) {
      return value!.value
    }
    return (choices || []).map(c => c.id)
  })

  useEffect(() => {
    if (helper.isValidArray(value?.value)) {
      setOrderedIds(value!.value)
    } else if (helper.isValidArray(choices)) {
      setOrderedIds(choices!.map(c => c.id))
    }
  }, [choices])

  const getChoice = useCallback((id: string) => (choices || []).find(c => c.id === id), [choices])

  function handleDragStart(index: number) {
    dragIndex.current = index
    setDraggingIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setOverIndex(index)
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === dropIndex) {
      setOverIndex(null)
      setDraggingIndex(null)
      return
    }

    const newIds = [...orderedIds]
    const [removed] = newIds.splice(dragIndex.current, 1)
    newIds.splice(dropIndex, 0, removed)

    dragIndex.current = null
    setDraggingIndex(null)
    setOverIndex(null)
    setOrderedIds(newIds)
    onChange?.({ value: newIds })
  }

  function handleDragEnd() {
    dragIndex.current = null
    setDraggingIndex(null)
    setOverIndex(null)
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const newIds = [...orderedIds]
    ;[newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]]
    setOrderedIds(newIds)
    onChange?.({ value: newIds })
  }

  function handleMoveDown(index: number) {
    if (index === orderedIds.length - 1) return
    const newIds = [...orderedIds]
    ;[newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]]
    setOrderedIds(newIds)
    onChange?.({ value: newIds })
  }

  if (!helper.isValidArray(choices)) {
    return null
  }

  return (
    <div className="heyform-ranking-root" {...restProps}>
      {orderedIds.map((id, index) => {
        const choice = getChoice(id)
        if (!choice) return null

        return (
          <div
            key={id}
            className={clsx('heyform-ranking-item', {
              'heyform-ranking-item-dragging': draggingIndex === index,
              'heyform-ranking-item-over': overIndex === index && draggingIndex !== index
            })}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={e => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <span className="heyform-ranking-badge">{index + 1}</span>
            <span className="heyform-ranking-label">{choice.label}</span>
            <div className="heyform-ranking-arrows">
              <button
                type="button"
                className="heyform-ranking-arrow-btn"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="heyform-ranking-arrow-btn"
                onClick={() => handleMoveDown(index)}
                disabled={index === orderedIds.length - 1}
              >
                ↓
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
