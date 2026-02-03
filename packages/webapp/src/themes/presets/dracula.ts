import type { ThemeDefinition } from '../types'

export const dracula: ThemeDefinition = {
  id: 'dracula',
  name: 'workspace.appearance.themes.dracula',
  mode: 'dark',
  colors: {
    background: '40, 42, 54', // #282a36
    foreground: '68, 71, 90', // #44475a
    input: '248, 248, 242, 10%', // #f8f8f2
    primary: '248, 248, 242', // #f8f8f2
    primaryLight: '68, 71, 90', // #44475a
    secondary: '189, 147, 249', // #bd93f9
    secondaryLight: '248, 248, 242, 2.5%',
    accent: '189, 147, 249', // #bd93f9 (purple)
    accentLight: '248, 248, 242, 5%',
    error: '255, 85, 85' // #ff5555
  },
  preview: {
    background: '#282a36',
    foreground: '#44475a',
    primary: '#f8f8f2',
    accent: '#bd93f9'
  }
}
