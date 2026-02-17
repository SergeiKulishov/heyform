import { IconChevronRight, IconX } from '@tabler/icons-react'
import { Button } from '@voxly/form-renderer'
import type { Choice } from '@voxly/shared-types-enums'
import { FC, startTransition, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReactSortable } from 'react-sortablejs'

import { clone, excludeObject, helper, nanoid } from '@voxly/utils'

import { useStoreContext } from '../../store'
import { FakeSubmit } from '../FakeSubmit'
import type { BlockProps } from './Block'
import { Block } from './Block'

interface RankingItemProps {
  index: number
  choice: Choice
  enableRemove?: boolean
  onRemove: (id: string) => void
  onChange?: (id: string, label: string) => void
}

const RankingItem: FC<RankingItemProps> = ({ index, choice, enableRemove, onRemove, onChange }) => {
  const { t } = useTranslation()
  const [value, setValue] = useState(choice.label)

  function handleChange(event: any) {
    const newValue = event.target.value
    setValue(newValue)
    startTransition(() => {
      onChange?.(choice.id, newValue)
    })
  }

  function handleRemove() {
    if (enableRemove) {
      onRemove(choice.id)
    }
  }

  return (
    <div className="heyform-ranking-builder-item">
      <span className="heyform-ranking-builder-handle cursor-move">⠿</span>
      <span className="heyform-ranking-builder-badge">{index + 1}</span>
      <input
        type="text"
        value={value}
        placeholder={t('form.builder.compose.rankingItemPlaceholder', { index: index + 1 })}
        onChange={handleChange}
        className="heyform-ranking-builder-input flex-1 bg-transparent outline-none"
      />
      {enableRemove && (
        <div className="heyform-radio-remove" onClick={handleRemove}>
          <IconX />
        </div>
      )}
    </div>
  )
}

export const Ranking: FC<BlockProps> = ({ field, locale, ...restProps }) => {
  const { t } = useTranslation()
  const { dispatch } = useStoreContext()

  function updateChoices(choices: Choice[]) {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            choices
          }
        }
      }
    })
  }

  function handleAddChoice() {
    const choices = clone(field.properties?.choices || [])
    choices.push({ id: nanoid(12), label: '' })
    updateChoices(choices)
  }

  function handleLabelChange(id: string, label: string) {
    const choices = clone(field.properties?.choices || [])
    const index = choices.findIndex((c: Choice) => c.id === id)
    if (index > -1) {
      choices[index].label = label
      updateChoices(choices)
    }
  }

  function handleRemoveChoice(id: string) {
    updateChoices((field.properties?.choices || []).filter((c: Choice) => c.id !== id))
  }

  const handleAddChoiceCallback = useCallback(handleAddChoice, [field.properties])
  const handleLabelChangeCallback = useCallback(handleLabelChange, [field.properties])
  const handleRemoveChoiceCallback = useCallback(handleRemoveChoice, [field.properties])

  const choices = helper.isValidArray(field.properties?.choices)
    ? clone(field.properties!.choices!)
    : []

  const handleSetList = useCallback(
    (newChoices: Choice[], sortable: any) => {
      if (sortable) {
        dispatch({
          type: 'updateField',
          payload: {
            id: field.id,
            updates: {
              properties: {
                ...field.properties,
                choices: newChoices.map(c => excludeObject(c, ['chosen', 'selected'])) as Choice[]
              }
            }
          }
        })
      }
    },
    [field.id, field.properties]
  )

  return (
    <Block className="heyform-ranking" field={field} locale={locale} {...restProps}>
      <ReactSortable
        className="flex flex-col gap-2"
        ghostClass="heyform-multiple-choice-ghost"
        chosenClass="heyform-multiple-choice-chosen"
        handle=".heyform-ranking-builder-handle"
        list={choices}
        setList={handleSetList}
        delay={10}
        animation={240}
        fallbackOnBody
      >
        {choices.map((choice: Choice, index: number) => (
          <RankingItem
            key={choice.id}
            index={index}
            choice={choice}
            enableRemove={choices.length > 1}
            onRemove={handleRemoveChoiceCallback}
            onChange={handleLabelChangeCallback}
          />
        ))}
      </ReactSortable>

      <div className="heyform-add-choice mt-2">
        <Button.Link className="heyform-add-column" onClick={handleAddChoiceCallback}>
          {t('form.builder.compose.addRankingItem')}
        </Button.Link>
      </div>

      <FakeSubmit text={t('Next', { lng: locale })} icon={<IconChevronRight />} />
    </Block>
  )
}
