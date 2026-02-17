import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { Switch } from '@/components'

import { useStoreContext } from '../../store'
import type { RequiredSettingsProps } from './Required'

const MatrixSettings: FC<RequiredSettingsProps> = ({ field }) => {
  const { dispatch } = useStoreContext()
  const { t } = useTranslation()

  function handleTypeChange(value: boolean) {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            matrixType: value ? 'multi' : 'single'
          }
        }
      }
    })
  }

  return (
    <div className="flex items-center justify-between">
      <label className="text-sm/6" htmlFor="#">
        {t('form.builder.settings.multipleSelection')}
      </label>
      <Switch value={field.properties?.matrixType === 'multi'} onChange={handleTypeChange} />
    </div>
  )
}

export default MatrixSettings
