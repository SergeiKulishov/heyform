import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { Switch } from '@/components'

import { useStoreContext } from '../../store'
import type { RequiredSettingsProps } from './Required'

const RankingSettings: FC<RequiredSettingsProps> = ({ field }) => {
  const { dispatch } = useStoreContext()
  const { t } = useTranslation()

  function handleRandomizeChange(value: boolean) {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            randomize: value
          }
        }
      }
    })
  }

  return (
    <div className="flex items-center justify-between">
      <label className="text-sm/6" htmlFor="#">
        {t('form.builder.settings.randomize')}
      </label>
      <Switch value={field.properties?.randomize} onChange={handleRandomizeChange} />
    </div>
  )
}

export default RankingSettings
