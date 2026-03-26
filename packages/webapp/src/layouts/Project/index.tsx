import { LayoutProps } from '@heyooo-inc/react-router'
import { IconUsers } from '@tabler/icons-react'
import { FC, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'

import { cn, useParam } from '@/utils'

import { Button, Tooltip } from '@/components'
import { useAppStore, useWorkspaceStore } from '@/store'

import { WorkspaceLayout } from '../Workspace'
import ProjectMembers from './ProjectMembers'
import ProjectMembersModal from './ProjectMembersModal'

export const ProjectLayout: FC<LayoutProps> = ({ options, children }) => {
  const { t } = useTranslation()

  const location = useLocation()
  const { workspaceId, projectId } = useParam()
  const { openModal } = useAppStore()
  const { project } = useWorkspaceStore()

  const navigations = useMemo(
    () => [
      {
        value: 'analytics',
        label: t('project.forms.title'),
        to: `/workspace/${workspaceId}/project/${projectId}/`
      },
      {
        value: 'trash',
        label: t('project.trash.title'),
        to: `/workspace/${workspaceId}/project/${projectId}/trash`
      }
    ],
    [projectId, workspaceId, t]
  )

  useEffect(() => {
    if (location.state?.isCreateModalOpen) {
      window.history.replaceState({}, '')
      openModal('CreateFormModal')
    }
  }, [location.state?.isCreateModalOpen])

  useEffect(() => {
    return () => {
      window.history.replaceState({}, '')
    }
  }, [])

  return (
    <>
      <WorkspaceLayout options={options}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl/8 font-semibold sm:text-xl/8">{project?.name}</h1>

          <div className="flex items-center gap-2">
            <Tooltip label={t('project.members.title')}>
              <Button.Ghost size="md" iconOnly onClick={() => openModal('ProjectMembersModal')}>
                <IconUsers className="h-5 w-5" />
              </Button.Ghost>
            </Tooltip>

            <Button size="md" onClick={() => openModal('CreateFormModal')}>
              {t('form.creation.title')}
            </Button>
          </div>
        </div>

        <ProjectMembers />

        {/* Navigation */}
        <div className="border-accent-light mt-5 border-b">
          <nav className="text-secondary flex items-center gap-6 text-sm font-medium">
            {navigations.map(n => (
              <NavLink
                key={n.value}
                className={({ isActive }) =>
                  cn('hover:text-primary py-3', {
                    'text-primary after:bg-primary relative after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full':
                      isActive
                  })
                }
                to={n.to}
                end
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {children}
      </WorkspaceLayout>

      <ProjectMembersModal />
    </>
  )
}
