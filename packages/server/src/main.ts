import { patchLegacyUtil } from './compat/legacy-util'

patchLegacyUtil()

import('./bootstrap').catch(error => {
  console.error(error)
  process.exit(1)
})
