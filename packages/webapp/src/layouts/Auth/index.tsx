import { LayoutProps } from '@heyooo-inc/react-router'
import { FC, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { helper } from '@voxly/utils'

import Logo from '@/assets/logo.svg?react'

import LanguageSwitcher from './LanguageSwitcher'

export const AuthLayout: FC<LayoutProps> = ({ options, children }) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (helper.isValid(options?.title)) {
      document.title = `${t(options!.title)} - Voxly`
    }
  }, [options, t])

  return (
    <div className="bg-foreground flex min-h-screen flex-col">
      <div className="bg-foreground sticky top-0 flex items-center justify-between p-4">
        <a href="/" className="flex items-center gap-2" title="HeyForm">
          <Logo className="h-8 w-auto" />
          <span className="text-xl font-medium">HeyForm</span>
        </a>

        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 flex-col justify-center p-4 lg:p-12">{children}</div>
    </div>
  )
}
