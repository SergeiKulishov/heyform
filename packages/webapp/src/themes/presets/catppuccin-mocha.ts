import type { ThemeDefinition } from '../types'

export const catppuccinMocha: ThemeDefinition = {
  id: 'catppuccin-mocha',
  name: 'workspace.appearance.themes.catppuccinMocha',
  mode: 'dark',
  colors: {
    background: '30, 30, 46', // #1e1e2e
    foreground: '49, 50, 68', // #313244
    input: '205, 214, 244, 10%', // #cdd6f4
    primary: '205, 214, 244', // #cdd6f4
    primaryLight: '49, 50, 68', // #313244
    secondary: '166, 173, 200', // #a6adc8
    secondaryLight: '205, 214, 244, 2.5%',
    accent: '203, 166, 247', // #cba6f7 (mauve)
    accentLight: '205, 214, 244, 5%',
    error: '243, 139, 168' // #f38ba8
  },
  preview: {
    background: '#1e1e2e',
    foreground: '#313244',
    primary: '#cdd6f4',
    accent: '#cba6f7'
  }
}
