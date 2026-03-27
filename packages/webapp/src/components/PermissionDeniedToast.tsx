import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from './Toast'

interface PermissionDeniedDetail {
  permissionKey: string | null
}

export const PermissionDeniedToast = () => {
  const { t } = useTranslation()
  const toast = useToast()

  useEffect(() => {
    const handler = (event: Event) => {
      const { permissionKey } = (event as CustomEvent<PermissionDeniedDetail>).detail

      let message: string

      if (permissionKey) {
        const actionLabel = t(`settings.permissions.keys.${permissionKey}`, {
          defaultValue: permissionKey
        })
        message = t('permissions.deniedWithAction', { action: actionLabel })
      } else {
        message = t('permissions.deniedMessage')
      }

      toast({
        title: t('permissions.denied'),
        message,
        variant: 'error',
        duration: 6_000
      })
    }

    window.addEventListener('permission-denied', handler)
    return () => window.removeEventListener('permission-denied', handler)
  }, [t, toast])

  return null
}
