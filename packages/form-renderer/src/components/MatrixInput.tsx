import type { Choice, MatrixValue } from '@voxly/shared-types-enums'
import clsx from 'clsx'
import type { FC } from 'react'
import { useCallback } from 'react'

import { helper } from '@voxly/utils'

import { IComponentProps } from '../typings'

interface MatrixInputProps extends Omit<IComponentProps, 'onChange' | 'value'> {
  value?: MatrixValue
  rows?: Choice[]
  columns?: Choice[]
  matrixType?: 'single' | 'multi'
  onChange?: (value: MatrixValue) => void
}

export const MatrixInput: FC<MatrixInputProps> = ({
  value = {},
  rows,
  columns,
  matrixType = 'single',
  onChange,
  ...restProps
}) => {
  const handleCellClick = useCallback(
    (rowId: string, colId: string) => {
      const newValue = { ...value }

      if (matrixType === 'multi') {
        const current = (newValue[rowId] as string[]) || []

        if (current.includes(colId)) {
          newValue[rowId] = current.filter(id => id !== colId)
        } else {
          newValue[rowId] = [...current, colId]
        }
      } else {
        newValue[rowId] = colId
      }

      onChange?.(newValue)
    },
    [value, matrixType, onChange]
  )

  function isCellSelected(rowId: string, colId: string): boolean {
    const selected = value[rowId]

    if (helper.isNil(selected)) {
      return false
    }

    if (Array.isArray(selected)) {
      return selected.includes(colId)
    }

    return selected === colId
  }

  if (!helper.isValidArray(rows) || !helper.isValidArray(columns)) {
    return null
  }

  return (
    <div className="heyform-matrix-root" {...restProps}>
      <table>
        <thead className="heyform-matrix-header">
          <tr>
            <th className="heyform-matrix-row-label" />
            {columns!.map(col => (
              <th key={col.id} className="heyform-matrix-col-label">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows!.map((row, rowIdx) => (
            <tr
              key={row.id}
              className={clsx('heyform-matrix-row', {
                'heyform-matrix-row-even': rowIdx % 2 === 1
              })}
            >
              <td className="heyform-matrix-row-label">{row.label}</td>
              {columns!.map(col => {
                const selected = isCellSelected(row.id, col.id)

                return (
                  <td
                    key={col.id}
                    className={clsx('heyform-matrix-cell', {
                      'heyform-matrix-cell-selected': selected
                    })}
                    onClick={() => handleCellClick(row.id, col.id)}
                  >
                    <span
                      className={clsx('heyform-matrix-indicator', {
                        'heyform-matrix-indicator-radio': matrixType === 'single',
                        'heyform-matrix-indicator-checkbox': matrixType === 'multi',
                        'heyform-matrix-indicator-selected': selected
                      })}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
