import type { ThemeDefinition } from '../types'

export const catppuccinLatte: ThemeDefinition = {
  id: 'catppuccin-latte',
  name: 'workspace.appearance.themes.catppuccinLatte',
  mode: 'light',
  colors: {
    background: '239, 241, 245', // #eff1f5
    foreground: '230, 233, 239', // #e6e9ef
    input: '76, 79, 105, 15%', // #4c4f69
    primary: '76, 79, 105', // #4c4f69
    primaryLight: '230, 233, 239', // #e6e9ef
    secondary: '108, 111, 133', // #6c6f85
    secondaryLight: '76, 79, 105, 2.5%',
    accent: '136, 57, 239', // #8839ef (mauve)
    accentLight: '76, 79, 105, 5%',
    error: '210, 15, 57' // #d20f39
  },
  preview: {
    background: '#eff1f5',
    foreground: '#e6e9ef',
    primary: '#4c4f69',
    accent: '#8839ef'
  }
}
