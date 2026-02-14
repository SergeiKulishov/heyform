import type { ThemeDefinition } from '../types'

export const solarizedDark: ThemeDefinition = {
  id: 'solarized-dark',
  name: 'workspace.appearance.themes.solarizedDark',
  mode: 'dark',
  colors: {
    background: '0, 43, 54',
    foreground: '7, 54, 66',
    input: '255, 255, 255, 10%',
    primary: '238, 232, 213',
    primaryLight: '7, 54, 66',
    secondary: '147, 161, 161',
    secondaryLight: '255, 255, 255, 4%',
    accent: '38, 139, 210',
    accentLight: '38, 139, 210, 20%',
    error: '220, 50, 47'
  },
  preview: {
    background: '#002b36',
    foreground: '#073642',
    primary: '#eee8d5',
    accent: '#268bd2'
  }
}
