export interface ThemeColors {
  background: string // RGB: "244, 244, 245"
  foreground: string
  input: string // RGBA: "9, 9, 11, 15%"
  primary: string
  primaryLight: string
  secondary: string
  secondaryLight: string
  accent: string
  accentLight: string
  error: string
}

export interface ThemePreview {
  background: string // HEX for preview in UI
  foreground: string
  primary: string
  accent: string
}

export interface ThemeDefinition {
  id: ThemeId
  name: string // Translation key
  mode: 'light' | 'dark'
  colors: ThemeColors
  preview: ThemePreview
}

export type ThemeId =
  | 'system'
  | 'default-light'
  | 'default-dark'
  | 'catppuccin-latte'
  | 'catppuccin-mocha'
  | 'dracula'
  | 'nord'
  | 'gruvbox-dark'
  | 'tokyo-night'
  | 'renaissance-light'
  | 'renaissance-dark'
  | 'material-light'
  | 'material-ocean'
  | 'github-light'
  | 'github-dark'
  | 'monokai-pro'
  | 'solarized-light'
  | 'solarized-dark'
