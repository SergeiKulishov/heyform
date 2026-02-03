import type { ThemeDefinition } from '../types'

export const tokyoNight: ThemeDefinition = {
  id: 'tokyo-night',
  name: 'workspace.appearance.themes.tokyoNight',
  mode: 'dark',
  colors: {
    background: '26, 27, 38', // #1a1b26
    foreground: '36, 40, 59', // #24283b
    input: '192, 202, 245, 10%', // #c0caf5
    primary: '192, 202, 245', // #c0caf5
    primaryLight: '36, 40, 59', // #24283b
    secondary: '169, 177, 214', // #a9b1d6
    secondaryLight: '192, 202, 245, 2.5%',
    accent: '122, 162, 247', // #7aa2f7 (blue)
    accentLight: '192, 202, 245, 5%',
    error: '247, 118, 142' // #f7768e
  },
  preview: {
    background: '#1a1b26',
    foreground: '#24283b',
    primary: '#c0caf5',
    accent: '#7aa2f7'
  }
}
