import type { ThemeDefinition } from '../types'

export const renaissanceLight: ThemeDefinition = {
  id: 'renaissance-light',
  name: 'workspace.appearance.themes.renaissance',
  mode: 'light',
  colors: {
    background: '250, 250, 252', // clean off-white page
    foreground: '255, 255, 255', // pure white cards
    input: '9, 9, 11, 10%', // subtle input borders
    primary: '245, 0, 122', // RenCredit brand pink — buttons & interactive
    primaryLight: '255, 255, 255', // white text on pink buttons
    secondary: '100, 100, 110', // muted secondary text
    secondaryLight: '9, 9, 11, 2.5%', // very subtle secondary bg
    accent: '255, 230, 242', // pale pink for hover/focus backgrounds
    accentLight: '245, 0, 122, 8%', // very light pink tint
    error: '220, 38, 38'
  },
  preview: {
    background: '#fafafc',
    foreground: '#ffffff',
    primary: '#f5007a',
    accent: '#ffe6f2'
  }
}
