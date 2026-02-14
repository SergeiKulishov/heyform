import type { ThemeId, ThemePreview } from '@/themes'

export const USER_STORAGE_KEY = 'HEYFORM_USER'
export const WORKSPACE_STORAGE_KEY = 'HEYFORM_WORKSPACE'
export const APPEARANCE_STORAGE_KEY = 'HEYFORM_APPEARANCE'
export const CHANGELOG_STORAGE_KEY = 'HEYFORM_CHANGELOG'

export const DEFAULT_PROJECT_NAMES: AnyMap = {
  de: "{name}'s Projekt",
  en: "{name}'s project",
  ru: 'Проект {name}',
  fr: 'Projet de {name}',
  ja: '{name}のプロジェクト',
  pl: 'Projekt {name}',
  'zh-cn': '{name}的项目',
  'zh-hk': '{name}的項目',
  'zh-tw': '{name}的專案'
}

export interface ThemeOption {
  id: ThemeId
  label: string
  preview?: ThemePreview
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'system',
    label: 'workspace.appearance.system'
  },
  {
    id: 'default-light',
    label: 'workspace.appearance.themes.defaultLight',
    preview: {
      background: '#f4f4f5',
      foreground: '#ffffff',
      primary: '#09090b',
      accent: '#e6e6e6'
    }
  },
  {
    id: 'default-dark',
    label: 'workspace.appearance.themes.defaultDark',
    preview: {
      background: '#09090b',
      foreground: '#18181b',
      primary: '#ffffff',
      accent: '#e6e6e6'
    }
  },
  {
    id: 'catppuccin-latte',
    label: 'workspace.appearance.themes.catppuccinLatte',
    preview: {
      background: '#eff1f5',
      foreground: '#e6e9ef',
      primary: '#4c4f69',
      accent: '#8839ef'
    }
  },
  {
    id: 'catppuccin-mocha',
    label: 'workspace.appearance.themes.catppuccinMocha',
    preview: {
      background: '#1e1e2e',
      foreground: '#313244',
      primary: '#cdd6f4',
      accent: '#cba6f7'
    }
  },
  {
    id: 'dracula',
    label: 'workspace.appearance.themes.dracula',
    preview: {
      background: '#282a36',
      foreground: '#44475a',
      primary: '#f8f8f2',
      accent: '#bd93f9'
    }
  },
  {
    id: 'nord',
    label: 'workspace.appearance.themes.nord',
    preview: {
      background: '#2e3440',
      foreground: '#3b4252',
      primary: '#eceff4',
      accent: '#88c0d0'
    }
  },
  {
    id: 'gruvbox-dark',
    label: 'workspace.appearance.themes.gruvboxDark',
    preview: {
      background: '#282828',
      foreground: '#3c3836',
      primary: '#ebdbb2',
      accent: '#d65d0e'
    }
  },
  {
    id: 'tokyo-night',
    label: 'workspace.appearance.themes.tokyoNight',
    preview: {
      background: '#1a1b26',
      foreground: '#24283b',
      primary: '#c0caf5',
      accent: '#7aa2f7'
    }
  },
  {
    id: 'renaissance-light',
    label: 'workspace.appearance.themes.renaissance',
    preview: {
      background: '#f9f9f9',
      foreground: '#ffffff',
      primary: '#ff007c',
      accent: '#ffe5f0'
    }
  },
  {
    id: 'renaissance-dark',
    label: 'workspace.appearance.themes.renaissanceDark',
    preview: {
      background: '#1c1c1c',
      foreground: '#2d2d2d',
      primary: '#ff007a',
      accent: '#ff007a'
    }
  },
  {
    id: 'material-light',
    label: 'workspace.appearance.themes.material',
    preview: {
      background: '#fafafa',
      foreground: '#ffffff',
      primary: '#2196f3',
      accent: '#bbdefb'
    }
  },
  {
    id: 'material-ocean',
    label: 'workspace.appearance.themes.materialOcean',
    preview: {
      background: '#010103',
      foreground: '#111115',
      primary: '#3498db',
      accent: '#3498db'
    }
  },
  {
    id: 'github-light',
    label: 'workspace.appearance.themes.github',
    preview: {
      background: '#f6f8fa',
      foreground: '#ffffff',
      primary: '#24292f',
      accent: '#0969da'
    }
  },
  {
    id: 'github-dark',
    label: 'workspace.appearance.themes.githubDark',
    preview: {
      background: '#0d1117',
      foreground: '#161b22',
      primary: '#94959c',
      accent: '#3a8af9'
    }
  },
  {
    id: 'monokai-pro',
    label: 'workspace.appearance.themes.monokaiPro',
    preview: {
      background: '#272822',
      foreground: '#31322c',
      primary: '#f9e8a1',
      accent: '#fd971f'
    }
  },
  {
    id: 'solarized-light',
    label: 'workspace.appearance.themes.solarized',
    preview: {
      background: '#fdf6e3',
      foreground: '#fdf6e3',
      primary: '#002b36',
      accent: '#268bd2'
    }
  },
  {
    id: 'solarized-dark',
    label: 'workspace.appearance.themes.solarizedDark',
    preview: {
      background: '#002b36',
      foreground: '#073642',
      primary: '#eee8d5',
      accent: '#268bd2'
    }
  }
]

// Keep for backwards compatibility
export const APPEARANCE_OPTIONS = THEME_OPTIONS.map(option => ({
  label: option.label,
  value: option.id
}))
