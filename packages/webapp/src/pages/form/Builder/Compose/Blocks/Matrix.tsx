import { IconChevronRight, IconX } from '@tabler/icons-react'
import { Button } from '@voxly/form-renderer'
import type { Choice } from '@voxly/shared-types-enums'
import type { FC } from 'react'
import { startTransition, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { clone, nanoid } from '@voxly/utils'

import { useStoreContext } from '../../store'
import { FakeSubmit } from '../FakeSubmit'
import type { BlockProps } from './Block'
import { Block } from './Block'

interface EditableLabelProps extends Omit<ComponentProps, 'onChange'> {
  item: Partial<Choice>
  placeholder: string
  deletable?: boolean
  onChange?: (id: string, value: string) => void
  onRemove?: (id: string) => void
}

const EditableLabel: FC<EditableLabelProps> = ({
  item,
  placeholder,
  deletable,
  onChange,
  onRemove
}) => {
  const [value, setValue] = useState(item.label)

  function handleChange(event: any) {
    const newValue = event.target.value
    setValue(newValue)
    startTransition(() => {
      onChange?.(item.id!, newValue)
    })
  }

  function handleRemove() {
    if (deletable) {
      onRemove?.(item.id!)
    }
  }

  return (
    <div className="heyform-matrix-editable-item">
      <div className="heyform-radio-remove" onClick={handleRemove}>
        <IconX />
      </div>
      <input type="text" value={value} placeholder={placeholder} onChange={handleChange} />
    </div>
  )
}

export const Matrix: FC<BlockProps> = ({ field, locale, ...restProps }) => {
  const { dispatch } = useStoreContext()
  const { t } = useTranslation()

  function updateProperties(updates: Record<string, any>) {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            ...updates
          }
        }
      }
    })
  }

  function handleAddRow() {
    updateProperties({
      rows: [...(field.properties?.rows || []), { id: nanoid(12), label: '' }]
    })
  }

  function handleRowLabelChange(rowId: string, label: string) {
    const rows = clone(field.properties?.rows || [])
    const index = rows.findIndex((r: Choice) => r.id === rowId)
    if (index > -1) {
      rows[index].label = label
      updateProperties({ rows })
    }
  }

  function handleRemoveRow(rowId: string) {
    updateProperties({
      rows: field.properties?.rows?.filter((r: Choice) => r.id !== rowId)
    })
  }

  function handleAddColumn() {
    updateProperties({
      matrixColumns: [...(field.properties?.matrixColumns || []), { id: nanoid(12), label: '' }]
    })
  }

  function handleColumnLabelChange(colId: string, label: string) {
    const matrixColumns = clone(field.properties?.matrixColumns || [])
    const index = matrixColumns.findIndex((c: Choice) => c.id === colId)
    if (index > -1) {
      matrixColumns[index].label = label
      updateProperties({ matrixColumns })
    }
  }

  function handleRemoveColumn(colId: string) {
    updateProperties({
      matrixColumns: field.properties?.matrixColumns?.filter((c: Choice) => c.id !== colId)
    })
  }

  const handleAddRowCallback = useCallback(handleAddRow, [field.properties])
  const handleRowLabelChangeCallback = useCallback(handleRowLabelChange, [field.properties])
  const handleRemoveRowCallback = useCallback(handleRemoveRow, [field.properties])
  const handleAddColumnCallback = useCallback(handleAddColumn, [field.properties])
  const handleColumnLabelChangeCallback = useCallback(handleColumnLabelChange, [field.properties])
  const handleRemoveColumnCallback = useCallback(handleRemoveColumn, [field.properties])

  const rows = field.properties?.rows || []
  const columns = field.properties?.matrixColumns || []

  return (
    <Block className="heyform-matrix" field={field} locale={locale} {...restProps}>
      <div className="mb-2 flex items-center justify-end gap-2">
        <Button.Link className="heyform-add-column" onClick={handleAddRowCallback}>
          {t('form.builder.compose.addRow')}
        </Button.Link>
        <Button.Link className="heyform-add-column" onClick={handleAddColumnCallback}>
          {t('form.builder.compose.addColumn')}
        </Button.Link>
      </div>
      <div className="heyform-table-scrollable">
        <table>
          <thead>
            <tr className="heyform-input-table-header">
              <th />
              {columns.map((col: Choice, colIdx: number) => (
                <th key={col.id}>
                  <EditableLabel
                    item={col}
                    placeholder={t('form.builder.compose.columnPlaceholder', { index: colIdx + 1 })}
                    deletable={columns.length > 1}
                    onChange={handleColumnLabelChangeCallback}
                    onRemove={handleRemoveColumnCallback}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: Choice, rowIdx: number) => (
              <tr key={row.id} className="heyform-input-table-row">
                <td>
                  <EditableLabel
                    item={row}
                    placeholder={t('form.builder.compose.rowPlaceholder', { index: rowIdx + 1 })}
                    deletable={rows.length > 1}
                    onChange={handleRowLabelChangeCallback}
                    onRemove={handleRemoveRowCallback}
                  />
                </td>
                {columns.map((col: Choice) => (
                  <td key={col.id} className="text-center">
                    <span className="heyform-matrix-preview-indicator" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FakeSubmit text={t('Next', { lng: locale })} icon={<IconChevronRight />} />
    </Block>
  )
}
