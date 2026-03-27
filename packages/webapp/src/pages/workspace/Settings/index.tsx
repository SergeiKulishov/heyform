import { useTranslation } from 'react-i18next'

import { AnchorNavigation } from '@/components'

import BrandKitModal from './BrandKitModal'
import WorkspaceBranding from './Branding'
import WorkspaceDeletion from './Deletion'
import WorkspaceDeletionModal from './DeletionModal'
import WorkspaceGeneral from './General'
import WorkspacePermissions from './Permissions'

export default function WorkspaceSettings() {
  const { t } = useTranslation()

  return (
    <>
      <div className="w-full">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl/8 font-semibold sm:text-xl/8">{t('settings.title')}</h1>

          <hr className="border-accent-light my-10 mt-6 w-full border-t" />

          <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-16 lg:space-y-0">
            <aside className="-mx-3 lg:w-1/4">
              <AnchorNavigation
                menus={[
                  {
                    label: t('settings.general.title'),
                    value: 'general'
                  },
                  {
                    label: t('settings.branding.title'),
                    value: 'branding'
                  },
                  {
                    label: t('settings.permissions.title'),
                    value: 'permissions'
                  },
                  {
                    label: t('settings.deletion.title'),
                    value: 'deletion'
                  }
                ]}
              />
            </aside>

            <div className="flex-1">
              <WorkspaceGeneral />
              <WorkspaceBranding />
              <WorkspacePermissions />
              <WorkspaceDeletion />
            </div>
          </div>
        </div>
      </div>

      <BrandKitModal />
      <WorkspaceDeletionModal />
    </>
  )
}
