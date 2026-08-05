import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      /**
       * Keep the palette in index.css. These twelve literals all have themed
       * var() equivalents, and a hardcoded one renders its light-mode value
       * under [data-theme="dark"] — which is how two Discover banner cards
       * ended up at 1.01:1 contrast (cream text on a near-white wash that
       * never flipped). Nothing throws; it just quietly becomes unreadable,
       * and only in the theme you weren't looking at.
       *
       * Covers both plain literals and template-literal text, since the
       * colors are written both ways.
       */
      'no-restricted-syntax': ['error',
        {
          selector: 'Literal[value=/#(2D9E72|1D7FC4|7048C8|C47A12|B93A3A|3F5BA9|EBF5F0|E8EEF5|EDEAF7|F5EDE5|FAEAEA|ECEFF6)/i]',
          message: 'Hardcoded palette color. Use the themed var: var(--c-fresh|soph|jun|sen|danger|lib) or var(--tint-*). For transparency use withAlpha(color, a) from lib/designTokens.',
        },
        {
          selector: 'TemplateElement[value.raw=/#(2D9E72|1D7FC4|7048C8|C47A12|B93A3A|3F5BA9|EBF5F0|E8EEF5|EDEAF7|F5EDE5|FAEAEA|ECEFF6)/i]',
          message: 'Hardcoded palette color in a template literal. Use the themed var, and withAlpha(color, a) for transparency.',
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
])
