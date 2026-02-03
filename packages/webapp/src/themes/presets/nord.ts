import type { ThemeDefinition } from '../types'

export const nord: ThemeDefinition = {
  id: 'nord',
  name: 'workspace.appearance.themes.nord',
  mode: 'dark',
  colors: {
    background: '46, 52, 64', // #2e3440
    foreground: '59, 66, 82', // #3b4252
    input: '236, 239, 244, 10%', // #eceff4
    primary: '236, 239, 244', // #eceff4
    primaryLight: '59, 66, 82', // #3b4252
    secondary: '216, 222, 233', // #d8dee9
    secondaryLight: '236, 239, 244, 2.5%',
    accent: '136, 192, 208', // #88c0d0 (frost)
    accentLight: '236, 239, 244, 5%',
    error: '191, 97, 106' // #bf616a
  },
  preview: {
    background: '#2e3440',
    foreground: '#3b4252',
    primary: '#eceff4',
    accent: '#88c0d0'
  }
}
