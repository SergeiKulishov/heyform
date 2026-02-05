import { IconArrowUpRight } from '@tabler/icons-react'
import { FormStatusEnum } from '@voxly/shared-types-enums'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { FormService } from '@/services'
import { useParam } from '@/utils'
import { helper } from '@voxly/utils'

import { Async, EmptyState, Repeat } from '@/components'
import { FormType } from '@/types'

import FormItem from '../Forms/FormItem'

export default function ProjectTrash() {
  const { t } = useTranslation()

  const { projectId } = useParam()
  const [forms, setForms] = useState<FormType[]>([])

  async function fetch() {
    const result = await FormService.forms(projectId, FormStatusEnum.TRASH)

    setForms(result)
    return helper.isValid(result)
  }

  function handleChange(_: string, form: FormType) {
    setForms(f => f.filter(row => row.id !== form.id))
  }

  return (
    <>
      <p className="text-secondary my-4 text-sm">
        <Trans
          t={t}
          i18nKey="project.trash.tip"
          components={{
            a: (
              <a
                className="hover:text-primary underline underline-offset-4"
                href="https://docs.heyform.net/quickstart/how-to-retrieve-forms-from-trash"
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
            icon: <IconArrowUpRight className="inline h-4 w-4" stroke={1.5} />
          }}
        />
      </p>

      <Async
        fetch={fetch}
        refreshDeps={[projectId]}
        loader={
          <div className="divide-accent-light divide-y [&_:first-of-type]:border-t-0">
            <Repeat count={3}>
              <FormItem.Skeleton />
            </Repeat>
          </div>
        }
        emptyRender={() => (
          <div className="border-accent-light flex flex-1 items-center justify-center rounded-lg border border-dashed py-36 shadow-sm">
            <EmptyState
              headline={t('project.trash.headline')}
              subHeadline={t('project.trash.subHeadline')}
            />
          </div>
        )}
      >
        <div className="divide-accent-light divide-y [&_:first-of-type]:border-t-0">
          {forms.map(f => (
            <FormItem key={f.id} form={f} isInTrash onChange={handleChange} />
          ))}
        </div>
      </Async>
    </>
  )
}
