import type { ThemeDefinition } from '../types'

export const materialLight: ThemeDefinition = {
  id: 'material-light',
  name: 'workspace.appearance.themes.material',
  mode: 'light',
  colors: {
    background: '250, 250, 250',
    foreground: '255, 255, 255',
    input: '9, 9, 11, 8%',
    primary: '33, 150, 243',
    primaryLight: '227, 242, 253',
    secondary: '97, 97, 97',
    secondaryLight: '9, 9, 11, 4%',
    accent: '187, 222, 251',
    accentLight: '33, 150, 243, 10%',
    error: '244, 67, 54'
  },
  preview: {
    background: '#fafafa',
    foreground: '#ffffff',
    primary: '#2196f3',
    accent: '#bbdefb'
  }
}
