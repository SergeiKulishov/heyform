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
  }
]

// Keep for backwards compatibility
export const APPEARANCE_OPTIONS = THEME_OPTIONS.map(option => ({
  label: option.label,
  value: option.id
}))
