#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Пути к файлам
const distIndexPath = path.join(__dirname, '../packages/webapp/dist/index.html')
const serverIndexPath = path.join(__dirname, '../packages/server/view/index.html')

// Читаем собранный index.html
const distContent = fs.readFileSync(distIndexPath, 'utf8')

// Заменяем пустой объект heyform на Handlebars переменную
const updatedContent = distContent.replace(
  /const heyform = \{\};?/,
  'const heyform = {{{json heyform}}};'
)

// Добавляем переменную locale
const finalContent = updatedContent.replace(
  'screenHeight: window.screen.height',
  "screenHeight: window.screen.height,\n        locale: '{{locale}}'"
)

// Записываем обновленный файл
fs.writeFileSync(serverIndexPath, finalContent)

console.log('✅ Updated packages/server/view/index.html with production build')
console.log('📦 React and React-DOM are now included in the build')
