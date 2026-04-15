import type { FormTheme } from '@voxly/shared-types-enums'

import { alpha, helper, hexToRgb, isDarkColor } from '@voxly/utils'

export const SYSTEM_FONTS =
  '-apple-system, BlinkMacSystemFont, Helvetica, Roboto, Tahoma, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", STXihei, "Microsoft YaHei", SimHei, "WenQuanYi Micro Hei", serif'

export const SELF_HOSTED_FONTS: Record<string, string[]> = {
  Mont: [
    '/static/fonts/Mont-Regular.ttf',
    '/static/fonts/Mont-SemiBold.ttf',
    '/static/fonts/Mont-Bold.ttf'
  ]
}

export const GOOGLE_FONTS = [
  'Mont',
  'Inter',
  'Public Sans',
  'Montserrat',
  'Alegreya',
  'B612',
  'Muli',
  'Titillium Web',
  'Varela',
  'Vollkorn',
  'IBM Plex Mono',
  'Crimson Text',
  'Cairo',
  'BioRhyme',
  'Karla',
  'Lora',
  'Frank Ruhl Libre',
  'Playfair Display',
  'Archivo',
  'Spectral',
  'Fjalla One',
  'Roboto',
  'Rubik',
  'Source Sans Pro',
  'Cardo',
  'Cormorant',
  'Work Sans',
  'Rakkas',
  'Concert One',
  'Yatra One',
  'Arvo',
  'Lato',
  'Abril Fatface',
  'Ubuntu',
  'PT Serif',
  'Old Standard TT',
  'Oswald',
  'Open Sans',
  'Courier Prime',
  'Poppins',
  'Josefin Sans',
  'Fira Sans',
  'Nunito',
  'Exo 2',
  'Merriweather',
  'Noto Sans'
]

export const DEFAULT_THEME: FormTheme = {
  fontFamily: 'Inter',
  questionTextColor: '#000',
  answerTextColor: '#0445AF',
  buttonBackground: '#0445AF',
  buttonTextColor: '#fff',
  backgroundColor: '#fff'
}

export function getWebFontURL(name?: string | string[]) {
  const fontNames = ((helper.isArray(name) ? name : [name]) as string[]).filter(
    row => row && GOOGLE_FONTS.includes(row) && !SELF_HOSTED_FONTS[row]
  )

  if (helper.isEmpty(fontNames)) {
    return ''
  }

  const families = fontNames.map(
    name => `family=${name.replace(/\s+/g, '+')}:wght@400;500;600;700;800`
  )

  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

export function insertSelfHostedFonts(names: string[], id = 'heyform-self-hosted-fonts') {
  const weights: Record<string, number> = {
    Regular: 400,
    SemiBold: 600,
    Bold: 700
  }

  const faces = names
    .filter(name => SELF_HOSTED_FONTS[name])
    .flatMap(name =>
      SELF_HOSTED_FONTS[name].map(url => {
        const weightKey = Object.keys(weights).find(k => url.includes(k)) ?? 'Regular'
        return `@font-face { font-family: '${name}'; src: url('${url}') format('truetype'); font-weight: ${weights[weightKey]}; font-display: swap; }`
      })
    )
    .join('\n')

  if (!faces) return

  let style = document.getElementById(id)

  if (!style) {
    style = document.createElement('style')
    style.id = id
    document.head.appendChild(style)
  }

  style.textContent = faces
}

export function insertWebFont(name?: string | string[], id = 'heyform-webfont') {
  const names = (helper.isArray(name) ? name : [name]) as string[]

  insertSelfHostedFonts(names)

  const href = getWebFontURL(name)

  if (!href) {
    return
  }

  let link = document.getElementById(id)

  if (!link) {
    link = document.createElement('link')

    link.id = id
    link.setAttribute('rel', 'stylesheet')

    document.head.appendChild(link)
  }

  link.setAttribute('href', href)
}

export function getTheme(theme?: FormTheme): FormTheme {
  const newTheme = {
    ...DEFAULT_THEME,
    ...theme
  }

  if (!newTheme.fontFamily || !GOOGLE_FONTS.includes(newTheme.fontFamily)) {
    newTheme.fontFamily = DEFAULT_THEME.fontFamily
  }

  return newTheme
}

function getAdaptedColor(color: string, alphaNum = 0.5, step = 20): string {
  const isDark = isDarkColor(color)
  const [red, green, blue] = hexToRgb(color).map(c =>
    isDark ? Math.min(255, c + step) : Math.max(0, c - step)
  )
  return `rgba(${red}, ${green}, ${blue}, ${alphaNum})`
}

export function getThemeStyle(theme: FormTheme, query?: Record<string, any>): string {
  if (helper.isTrue(query?.transparentBackground)) {
    theme.backgroundColor = 'transparent'
    theme.backgroundImage = undefined
  }

  return `
  html {
    --heyform-font-family: ${theme.fontFamily};
    --heyform-question-color: ${theme.questionTextColor};
    --heyform-description-color: ${alpha(theme.questionTextColor!, 0.7)};
    --heyform-label-color: ${alpha(theme.questionTextColor!, 0.5)};
    --heyform-answer-color: ${theme.answerTextColor};
    --heyform-answer-opacity-80-color: ${alpha(theme.answerTextColor!, 0.8)};
    --heyform-answer-opacity-60-color: ${alpha(theme.answerTextColor!, 0.6)};
    --heyform-answer-opacity-30-color: ${alpha(theme.answerTextColor!, 0.3)};
    --heyform-answer-opacity-10-color: ${alpha(theme.answerTextColor!, 0.1)};
    --heyform-button-color: ${theme.buttonBackground};
    --heyform-button-opacity-80-color: ${alpha(theme.buttonBackground!, 0.8)};
    --heyform-button-text-color: ${theme.buttonTextColor};
    --heyform-button-text-opacity-20-color: ${alpha(theme.buttonTextColor!, 0.2)};
    --heyform-background-color: ${theme.backgroundColor};
    --heyform-group-background-color: ${getAdaptedColor(theme.backgroundColor!)};
  }
  
  .heyform-theme-background {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 2;
    background-size: cover;
    background-position: center;
    pointer-events: none;
    background-color: var(--heyform-background-color);
    ${theme.backgroundImage ? (helper.isURL(theme.backgroundImage) ? `background-image: url(${theme.backgroundImage});` : `background-image: ${theme.backgroundImage}`) : ''}
  }

  .heyform-block-group {
    pointer-events: none;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    padding-left: 5rem;
    padding-right: 5rem;
    background: var(--heyform-group-background-color);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
    z-index: 12;
  }
  
  @media (max-width: 800px) {
    .heyform-block-group {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  
    .heyform-theme-background,
    .heyform-block-group {
      position: fixed;
    }
  }

  ${
    helper.isValid(theme.backgroundBrightness)
      ? `
    .heyform-theme-background:before {
      pointer-events: none;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      content: "";
      z-index: 2;
      opacity: ${Math.abs(theme.backgroundBrightness! / 100)};
      background: ${theme.backgroundBrightness! > 0 ? '#fff' : '#000'};
    }`
      : ''
  }
  `
}

export function getStripeElementStyle(theme: FormTheme) {
  return {
    base: {
      color: theme.answerTextColor,
      fontFamily: [theme.fontFamily, SYSTEM_FONTS].filter(Boolean).join(','),
      fontSize: '24px',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: alpha(theme.answerTextColor!, 0.3)
      }
    },
    invalid: {
      color: '#dc2626'
    }
  }
}
