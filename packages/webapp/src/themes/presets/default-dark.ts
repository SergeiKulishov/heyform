import type { ThemeDefinition } from '../types'

export const defaultDark: ThemeDefinition = {
  id: 'default-dark',
  name: 'workspace.appearance.themes.defaultDark',
  mode: 'dark',
  colors: {
    background: '9, 9, 11',
    foreground: '24, 24, 27',
    input: '255, 255, 255, 10%',
    primary: '255, 255, 255',
    primaryLight: '24, 24, 27',
    secondary: '161, 161, 170',
    secondaryLight: '255, 255, 255, 2.5%',
    accent: '230, 230, 230',
    accentLight: '255, 255, 255, 5%',
    error: '220, 38, 38'
  },
  preview: {
    background: '#09090b',
    foreground: '#18181b',
    primary: '#ffffff',
    accent: '#e6e6e6'
  }
}
