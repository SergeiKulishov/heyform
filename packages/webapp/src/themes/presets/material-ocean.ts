import type { ThemeDefinition } from '../types'

export const materialOcean: ThemeDefinition = {
  id: 'material-ocean',
  name: 'workspace.appearance.themes.materialOcean',
  mode: 'dark',
  colors: {
    background: '1, 1, 3',
    foreground: '17, 17, 21',
    input: '255, 255, 255, 10%',
    primary: '52, 152, 219',
    primaryLight: '17, 17, 21',
    secondary: '159, 159, 159',
    secondaryLight: '255, 255, 255, 4%',
    accent: '52, 152, 219',
    accentLight: '52, 152, 219, 20%',
    error: '229, 57, 53'
  },
  preview: {
    background: '#010103',
    foreground: '#111115',
    primary: '#3498db',
    accent: '#3498db'
  }
}
