import { ReactFlowProvider } from 'react-flow-renderer'
import { useTranslation } from 'react-i18next'

import IconEdgeArrow from '@/assets/edge-arrow.svg?react'

import { Flow } from './Flow'

export default function LogicFlow() {
  const { t } = useTranslation()

  return (
    <div className="logic-flow">
      <IconEdgeArrow className="text-secondary absolute opacity-0" />
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10">
        <div className="text-secondary pointer-events-auto flex flex-col gap-1.5 rounded-md bg-white/80 p-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-gray-400" />
            <span>{t('form.builder.logic.flow.legend.defaultFlow')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 border-t-2 border-dashed border-gray-400" />
            <span>{t('form.builder.logic.flow.legend.backwardJump')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-red-500" />
            <span>{t('form.builder.logic.flow.legend.brokenJump')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
