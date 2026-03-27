import Router, { Route } from '@heyooo-inc/react-router'
import * as Tooltip from '@radix-ui/react-tooltip'
import { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'

import { getAuthState, getDeviceId, setCookie, setDeviceId } from '@/utils'

import { PermissionDeniedToast, Toaster } from '@/components'
import { REDIRECT_COOKIE_NAME } from '@/consts'
import '@/i18n'
import { AuthLayout } from '@/layouts'
import routes from '@/routes'
import '@/styles/globals.scss'

if (!getDeviceId()) {
  setDeviceId()
}

const Fallback = () => {
  const { t } = useTranslation()

  return (
    <AuthLayout>
      <h1 className="text-center text-2xl font-semibold">{t('components.error.title')}</h1>
      <p className="text-secondary text-center text-sm/6">{t('components.error.message')}</p>
    </AuthLayout>
  )
}

const App = () => {
  function render(options?: any, children?: ReactNode) {
    const isLoggedIn = getAuthState()

    if (options?.loginRequired) {
      if (!isLoggedIn) {
        const redirectUri = window.location.pathname + window.location.search

        setCookie(REDIRECT_COOKIE_NAME, redirectUri, {})
        return <Navigate to="/login" replace />
      }
    } else {
      if (isLoggedIn && options?.redirectIfLogged) {
        return <Navigate to="/" replace />
      } else {
        return children
      }
    }
  }

  return (
    <ErrorBoundary fallback={<Fallback />}>
      <Tooltip.Provider>
        <Router routes={routes as Route[]} render={render} />
      </Tooltip.Provider>
      <Toaster />
      <PermissionDeniedToast />
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
