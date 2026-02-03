import {
  catppuccinLatte,
  catppuccinMocha,
  defaultDark,
  defaultLight,
  dracula,
  gruvboxDark,
  nord,
  tokyoNight
} from './presets'
import type { ThemeColors, ThemeDefinition, ThemeId } from './types'

export const themes: Record<Exclude<ThemeId, 'system'>, ThemeDefinition> = {
  'default-light': defaultLight,
  'default-dark': defaultDark,
  'catppuccin-latte': catppuccinLatte,
  'catppuccin-mocha': catppuccinMocha,
  dracula: dracula,
  nord: nord,
  'gruvbox-dark': gruvboxDark,
  'tokyo-night': tokyoNight
}

const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  background: '--hf-background',
  foreground: '--hf-foreground',
  input: '--hf-input',
  primary: '--hf-primary',
  primaryLight: '--hf-primary-light',
  secondary: '--hf-secondary',
  secondaryLight: '--hf-secondary-light',
  accent: '--hf-accent',
  accentLight: '--hf-accent-light',
  error: '--hf-error'
}

/**
 * Migrate legacy theme values ('light', 'dark') to new theme IDs
 */
export function migrateThemeValue(value: string): ThemeId {
  const migration: Record<string, ThemeId> = {
    light: 'default-light',
    dark: 'default-dark',
    system: 'system'
  }
  return migration[value] ?? (value as ThemeId) ?? 'system'
}

/**
 * Apply a theme to the document
 */
export function applyTheme(themeId: ThemeId): void {
  const root = document.documentElement

  // For 'system', determine by system preferences
  if (themeId === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'default-dark' : 'default-light')
    return
  }

  const theme = themes[themeId]
  if (!theme) {
    // Fallback to default light if theme not found
    applyTheme('default-light')
    return
  }

  // Set dark/light class for TailwindCSS
  root.classList.toggle('dark', theme.mode === 'dark')

  // Apply CSS variables inline
  Object.entries(CSS_VAR_MAP).forEach(([key, cssVar]) => {
    root.style.setProperty(cssVar, theme.colors[key as keyof ThemeColors])
  })

  // Set data attribute for identification
  root.dataset.theme = themeId
}

/**
 * Get theme definition by ID (excluding 'system')
 */
export function getTheme(themeId: ThemeId): ThemeDefinition | undefined {
  if (themeId === 'system') {
    return undefined
  }
  return themes[themeId]
}

/**
 * Get all available themes
 */
export function getAllThemes(): ThemeDefinition[] {
  return Object.values(themes)
}
