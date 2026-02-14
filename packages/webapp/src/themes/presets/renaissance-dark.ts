import type { ThemeDefinition } from '../types'

export const renaissanceDark: ThemeDefinition = {
  id: 'renaissance-dark',
  name: 'workspace.appearance.themes.renaissanceDark',
  mode: 'dark',
  colors: {
    background: '16, 16, 20', // very deep near-black
    foreground: '26, 26, 32', // slightly lifted card bg
    input: '255, 255, 255, 10%', // subtle input borders
    primary: '245, 0, 122', // RenCredit brand pink — buttons & interactive
    primaryLight: '255, 255, 255', // white text on pink buttons
    secondary: '140, 140, 155', // muted secondary text
    secondaryLight: '255, 255, 255, 2.5%',
    accent: '245, 0, 122', // pink for ghost button highlights
    accentLight: '245, 0, 122, 15%', // pink glow for hover/focus
    error: '239, 68, 68'
  },
  preview: {
    background: '#101014',
    foreground: '#1a1a20',
    primary: '#f5007a',
    accent: '#f5007a'
  }
}
