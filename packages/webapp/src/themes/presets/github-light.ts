import type { ThemeDefinition } from '../types'

export const githubLight: ThemeDefinition = {
  id: 'github-light',
  name: 'workspace.appearance.themes.github',
  mode: 'light',
  colors: {
    background: '246, 248, 250',
    foreground: '255, 255, 255',
    input: '9, 9, 11, 6%',
    primary: '36, 41, 46',
    primaryLight: '255, 255, 255',
    secondary: '101, 103, 107',
    secondaryLight: '9, 9, 11, 2%',
    accent: '9, 92, 210',
    accentLight: '9, 92, 210, 10%',
    error: '218, 54, 51'
  },
  preview: {
    background: '#f6f8fa',
    foreground: '#ffffff',
    primary: '#24292f',
    accent: '#0969da'
  }
}
