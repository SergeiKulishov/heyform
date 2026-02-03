import type { ThemeDefinition } from '../types'

export const defaultLight: ThemeDefinition = {
  id: 'default-light',
  name: 'workspace.appearance.themes.defaultLight',
  mode: 'light',
  colors: {
    background: '244, 244, 245',
    foreground: '255, 255, 255',
    input: '9, 9, 11, 15%',
    primary: '9, 9, 11',
    primaryLight: '255, 255, 255',
    secondary: '113, 113, 122',
    secondaryLight: '9, 9, 11, 2.5%',
    accent: '230, 230, 230',
    accentLight: '9, 9, 11, 5%',
    error: '220, 38, 38'
  },
  preview: {
    background: '#f4f4f5',
    foreground: '#ffffff',
    primary: '#09090b',
    accent: '#e6e6e6'
  }
}
