import type { ThemeDefinition } from '../types'

export const solarizedLight: ThemeDefinition = {
  id: 'solarized-light',
  name: 'workspace.appearance.themes.solarized',
  mode: 'light',
  colors: {
    background: '253, 246, 227',
    foreground: '253, 246, 227',
    input: '7, 54, 66, 10%',
    primary: '0, 43, 54',
    primaryLight: '238, 232, 213',
    secondary: '101, 123, 131',
    secondaryLight: '7, 54, 66, 4%',
    accent: '38, 139, 210',
    accentLight: '38, 139, 210, 15%',
    error: '220, 50, 47'
  },
  preview: {
    background: '#fdf6e3',
    foreground: '#fdf6e3',
    primary: '#002b36',
    accent: '#268bd2'
  }
}
