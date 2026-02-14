import type { ThemeDefinition } from '../types'

export const githubDark: ThemeDefinition = {
  id: 'github-dark',
  name: 'workspace.appearance.themes.githubDark',
  mode: 'dark',
  colors: {
    background: '13, 17, 23',
    foreground: '22, 27, 34',
    input: '255, 255, 255, 10%',
    primary: '148, 151, 156',
    primaryLight: '22, 27, 34',
    secondary: '139, 148, 158',
    secondaryLight: '255, 255, 255, 4%',
    accent: '58, 140, 255',
    accentLight: '58, 140, 255, 20%',
    error: '248, 81, 73'
  },
  preview: {
    background: '#0d1117',
    foreground: '#161b22',
    primary: '#94959c',
    accent: '#3a8af9'
  }
}
