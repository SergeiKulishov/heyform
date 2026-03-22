import { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { getDeviceId, useRouter } from '@/utils'

import IconApple from '@/assets/apple.svg?react'
import IconGoogle from '@/assets/google.svg?react'
import { Button, Divider } from '@/components'
import { DISABLE_LOGIN_WITH_APPLE, DISABLE_LOGIN_WITH_GOOGLE } from '@/consts/env'

interface SocialLoginProps {
  isSignUp?: boolean
}

const SocialLogin: FC<SocialLoginProps> = () => {
  const { t } = useTranslation()
  const router = useRouter()

  function handleConnect(type: string) {
    router.redirect(`/connect/${type}`, {
      query: {
        state: getDeviceId()
      },
      extend: true
    })
  }

  if (DISABLE_LOGIN_WITH_GOOGLE && DISABLE_LOGIN_WITH_APPLE) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-4">
        {!DISABLE_LOGIN_WITH_GOOGLE && (
          <Button
            variant="outline"
            className="block w-full"
            onClick={() => handleConnect('google')}
          >
            <IconGoogle className="h-4 w-4" />
            <span>Google</span>
          </Button>
        )}

        {!DISABLE_LOGIN_WITH_APPLE && (
          <Button variant="outline" className="block w-full" onClick={() => handleConnect('apple')}>
            <IconApple className="-mt-0.5 h-4 w-4" />
            <span>Apple</span>
          </Button>
        )}
      </div>

      <Divider>{t('login.continueWith')}</Divider>
    </>
  )
}

export default SocialLogin
