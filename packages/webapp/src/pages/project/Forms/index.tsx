import { FormStatusEnum } from '@voxly/shared-types-enums'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FolderService, FormService } from '@/services'
import { canCreateForms, useParam } from '@/utils'
import { helper } from '@voxly/utils'

import { Async, EmptyState, Repeat } from '@/components'
import { useAppStore, useWorkspaceStore } from '@/store'
import { FolderType, FormType } from '@/types'

import { FolderSection } from './FolderSection'
import FormItem from './FormItem'

export default function ProjectForms() {
  const { t } = useTranslation()

  const { projectId } = useParam()
  const { openModal } = useAppStore()
  const workspace = useWorkspaceStore(state => state.workspace)
  const { folders: storeFolders, setFolders } = useWorkspaceStore()
  const [forms, setForms] = useState<FormType[]>([])

  const folders = storeFolders.filter(f => f.projectId === projectId)

  async function fetch() {
    const [foldersResult, formsResult] = await Promise.all([
      FolderService.folders(projectId),
      FormService.forms(projectId, FormStatusEnum.NORMAL)
    ])

    setFolders(projectId, foldersResult)
    setForms(formsResult)
    return helper.isValid(formsResult) || helper.isValid(foldersResult)
  }

  function handleChange(type: string, form: FormType) {
    switch (type) {
      case 'rename':
        setForms(f => f.map(row => (row.id === form.id ? form : row)))
        break

      case 'trash':
        setForms(f => f.filter(row => row.id !== form.id))
        break

      case 'moveToFolder':
        setForms(f => f.map(row => (row.id === form.id ? form : row)))
        break
    }
  }

  function handleFolderChange() {
    FolderService.folders(projectId).then(result => setFolders(projectId, result))
  }

  const rootFolders = folders.filter(f => f.parentId === null).sort((a, b) => a.order - b.order)
  const formsWithoutFolder = forms.filter(f => !f.folderId)

  const renderFolder = (folder: FolderType) => {
    const subFolders = folders
      .filter(f => f.parentId === folder.id)
      .sort((a, b) => a.order - b.order)
    const formsInFolder = forms.filter(f => f.folderId === folder.id)

    return (
      <FolderSection
        key={folder.id}
        folder={folder}
        forms={formsInFolder}
        subFolders={subFolders}
        onFormChange={handleChange}
        onFolderChange={handleFolderChange}
      >
        {subFolders.map(sub => renderFolder(sub))}
        {formsInFolder.map(f => (
          <FormItem
            key={f.id}
            form={f}
            folders={folders}
            onChange={handleChange}
            onFolderChange={handleFolderChange}
          />
        ))}
      </FolderSection>
    )
  }

  const renderFormsList = () => {
    if (folders.length === 0) {
      return (
        <div className="divide-accent-light divide-y [&_:first-of-type]:border-t-0">
          {forms.map(f => (
            <FormItem key={f.id} form={f} folders={folders} onChange={handleChange} />
          ))}
        </div>
      )
    }

    return (
      <>
        {rootFolders.map(folder => renderFolder(folder))}

        {formsWithoutFolder.length > 0 && (
          <div className="mt-4">
            <div className="text-secondary px-2 py-2 text-sm font-medium">
              {t('folder.noFolder')}
            </div>
            <div className="divide-accent-light divide-y [&_:first-of-type]:border-t-0">
              {formsWithoutFolder.map(f => (
                <FormItem
                  key={f.id}
                  form={f}
                  folders={folders}
                  onChange={handleChange}
                  onFolderChange={handleFolderChange}
                />
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
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
        <div className="border-accent-light mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed py-36 shadow-sm">
          <EmptyState
            headline={t('project.forms.headline')}
            subHeadline={t('dashboard.pickTemplate')}
            buttonTitle={canCreateForms(workspace) ? t('form.creation.title') : undefined}
            onClick={canCreateForms(workspace) ? () => openModal('CreateFormModal') : undefined}
          />
        </div>
      )}
    >
      {renderFormsList()}
    </Async>
  )
}
