import type { ThemeDefinition } from '../types'

export const monokaiPro: ThemeDefinition = {
  id: 'monokai-pro',
  name: 'workspace.appearance.themes.monokaiPro',
  mode: 'dark',
  colors: {
    background: '39, 40, 34',
    foreground: '49, 50, 44',
    input: '255, 255, 255, 10%',
    primary: '249, 234, 193',
    primaryLight: '49, 50, 44',
    secondary: '157, 160, 173',
    secondaryLight: '255, 255, 255, 4%',
    accent: '249, 153, 53',
    accentLight: '249, 153, 53, 20%',
    error: '249, 38, 114'
  },
  preview: {
    background: '#272822',
    foreground: '#31322c',
    primary: '#f9e8a1',
    accent: '#fd971f'
  }
}
