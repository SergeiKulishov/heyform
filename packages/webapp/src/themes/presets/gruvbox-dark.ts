import type { ThemeDefinition } from '../types'

export const gruvboxDark: ThemeDefinition = {
  id: 'gruvbox-dark',
  name: 'workspace.appearance.themes.gruvboxDark',
  mode: 'dark',
  colors: {
    background: '40, 40, 40', // #282828
    foreground: '60, 56, 54', // #3c3836
    input: '235, 219, 178, 10%', // #ebdbb2
    primary: '235, 219, 178', // #ebdbb2
    primaryLight: '60, 56, 54', // #3c3836
    secondary: '168, 153, 132', // #a89984
    secondaryLight: '235, 219, 178, 2.5%',
    accent: '214, 93, 14', // #d65d0e (orange)
    accentLight: '235, 219, 178, 5%',
    error: '204, 36, 29' // #cc241d
  },
  preview: {
    background: '#282828',
    foreground: '#3c3836',
    primary: '#ebdbb2',
    accent: '#d65d0e'
  }
}
