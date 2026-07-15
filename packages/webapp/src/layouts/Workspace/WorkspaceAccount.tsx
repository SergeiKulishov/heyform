import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconCheck, IconChevronRight, IconDeviceDesktop } from '@tabler/icons-react'
import { useLocalStorageState } from 'ahooks'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { clearAuthState, cn, useRouter } from '@/utils'

import { Avatar, Button } from '@/components'
import { APPEARANCE_STORAGE_KEY, LOCALE_OPTIONS, PACKAGE_VERSION, THEME_OPTIONS } from '@/consts'
import { useAppStore, useUserStore } from '@/store'
import type { ThemeId } from '@/themes'
import { applyTheme, migrateThemeValue } from '@/themes'

interface WorkspaceAccountProps extends ComponentProps {
  containerClassName?: string
  isNameVisible?: boolean
}

export default function WorkspaceAccount({
  className,
  containerClassName,
  isNameVisible = true
}: WorkspaceAccountProps) {
  const { t, i18n } = useTranslation()

  const router = useRouter()
  const { user } = useUserStore()
  const { openModal } = useAppStore()

  const [storedTheme, setStoredTheme] = useLocalStorageState<string>(APPEARANCE_STORAGE_KEY, {
    defaultValue: 'system',
    listenStorageChange: true
  })

  // Migrate legacy theme values and get current theme ID
  const theme = migrateThemeValue(storedTheme || 'system')

  function handleLogout() {
    clearAuthState()
    router.redirect('/logout', {
      extend: false
    })
  }

  function setTheme(themeId: ThemeId) {
    setStoredTheme(themeId)
  }

  const handleSystemThemeChange = useCallback(() => {
    if (theme === 'system') {
      applyTheme('system')
    }
  }, [theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [handleSystemThemeChange])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className={cn('border-accent-light border-t px-2.5 py-2.5 sm:py-2.5', containerClassName)}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button.Link
            className={cn(
              'h-auto w-full px-3 py-2.5 sm:h-auto sm:px-2 sm:py-1.5 [&_[data-slot=button]]:justify-start [&_[data-slot=button]]:gap-x-3.5',
              className
            )}
          >
            <Avatar
              className="h-8 w-8"
              src={user?.avatar}
              fallback={user?.name}
              data-slot="avatar"
            />
            {isNameVisible && (
              <div className="flex-1 text-left">
                <div className="text-sm">{user?.name}</div>
                <div className="text-secondary text-xs">{t('workspace.sidebar.viewProfile')}</div>
              </div>
            )}
          </Button.Link>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="bg-foreground ring-accent-light isolate z-10 min-w-80 rounded-xl p-1.5 shadow-lg outline outline-1 outline-transparent ring-1 focus:outline-none lg:min-w-64"
            align="start"
            sideOffset={8}
          >
            <DropdownMenu.Item className="focus-visible:outline-none">
              <Button.Link
                className="data-[highlighted]:bg-accent-light w-full [&_[data-slot=button]]:justify-start"
                size="md"
                onClick={() => openModal('UserAccountModal')}
              >
                {t('workspace.sidebar.accountSettings')}
              </Button.Link>
            </DropdownMenu.Item>

            {/* Locale switcher */}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger asChild>
                <Button.Link
                  className="data-[highlighted]:bg-accent-light data-[state=open]:bg-accent-light hidden w-full sm:block [&_[data-slot=button]]:justify-between"
                  size="md"
                >
                  {t('workspace.sidebar.language')}
                  <IconChevronRight className="text-secondary h-[1.125rem] w-[1.125rem]" />
                </Button.Link>
              </DropdownMenu.SubTrigger>

              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  className="bg-foreground ring-accent-light isolate z-10 min-w-80 rounded-xl p-1.5 shadow-lg outline outline-1 outline-transparent ring-1 focus:outline-none lg:min-w-64"
                  sideOffset={8}
                  alignOffset={-8}
                >
                  {LOCALE_OPTIONS.map(l => (
                    <DropdownMenu.Item
                      key={l.value}
                      className="text-primary data-[highlighted]:bg-accent-light grid cursor-pointer grid-cols-[theme(spacing.5),1fr] items-center gap-x-2.5 rounded-lg px-3 py-2.5 text-base/6 outline-none focus-visible:outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 sm:grid-cols-[theme(spacing.4),1fr] sm:px-2 sm:py-1.5 sm:text-sm/6"
                      onClick={() => i18n.changeLanguage(l.value)}
                    >
                      {i18n.language === l.value ? (
                        <IconCheck className="text-secondary h-[1.125rem] w-[1.125rem]" />
                      ) : (
                        <i />
                      )}

                      <div>
                        <div
                          className="text-primary text-sm/[1.4rem] font-medium"
                          data-slot="label"
                        >
                          {t(l.label)}
                        </div>
                        <div className="text-secondary text-xs" data-slot="translated">
                          {t(l.translated)}
                        </div>
                      </div>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            {/* Appearance switcher */}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger asChild>
                <Button.Link
                  className="data-[highlighted]:bg-accent-light data-[state=open]:bg-accent-light hidden w-full sm:block [&_[data-slot=button]]:justify-between"
                  size="md"
                >
                  {t('workspace.appearance.title')}
                  <IconChevronRight className="text-secondary h-[1.125rem] w-[1.125rem]" />
                </Button.Link>
              </DropdownMenu.SubTrigger>

              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  className="bg-foreground ring-accent-light isolate z-10 min-w-[320px] rounded-xl p-2 shadow-lg outline outline-1 outline-transparent ring-1 focus:outline-none"
                  sideOffset={8}
                  alignOffset={-8}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map(option => (
                      <DropdownMenu.Item
                        key={option.id}
                        className={cn(
                          'flex cursor-pointer flex-col items-center rounded-lg border-2 p-2 outline-none transition-colors focus-visible:outline-none',
                          theme === option.id
                            ? 'border-primary bg-accent-light'
                            : 'hover:bg-accent-light border-transparent'
                        )}
                        onClick={() => setTheme(option.id)}
                      >
                        {/* Theme preview */}
                        {option.preview ? (
                          <div
                            className="mb-1.5 h-10 w-full overflow-hidden rounded"
                            style={{ backgroundColor: option.preview.background }}
                          >
                            <div className="flex h-full items-end gap-0.5 p-1">
                              <div
                                className="h-3 w-3 rounded-sm"
                                style={{ backgroundColor: option.preview.foreground }}
                              />
                              <div
                                className="h-3 w-3 rounded-sm"
                                style={{ backgroundColor: option.preview.accent }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="bg-accent-light mb-1.5 flex h-10 w-full items-center justify-center overflow-hidden rounded">
                            <IconDeviceDesktop className="text-secondary h-5 w-5" />
                          </div>
                        )}
                        <span className="text-primary text-center text-xs font-medium">
                          {t(option.label)}
                        </span>
                        {theme === option.id && (
                          <IconCheck className="text-primary mt-0.5 h-3.5 w-3.5" />
                        )}
                      </DropdownMenu.Item>
                    ))}
                  </div>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            <DropdownMenu.Item className="focus-visible:outline-none" onClick={handleLogout}>
              <Button.Link className="data-[highlighted]:bg-accent-light w-full [&_[data-slot=button]]:justify-start">
                {t('workspace.sidebar.logout')}
              </Button.Link>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="bg-accent-light mx-2 mb-1 mt-2 h-px sm:mx-2" />

            <DropdownMenu.Item className="focus-visible:outline-none">
              <div className="text-secondary px-3 py-2.5 text-sm/6 sm:px-2 sm:py-2">
                {t('workspace.sidebar.version', { version: PACKAGE_VERSION })}
              </div>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
