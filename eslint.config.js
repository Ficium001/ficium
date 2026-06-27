import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // ── Vercel serverless functions (api/) ────────────────────────────────────
  // TypeScript files transpiled by Vercel — thin glue layers, not domain code.
  // any is acceptable; strict no-explicit-any is a src/ concern only.
  {
    files: ['api/**/*.{ts,js}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-useless-assignment': 'off',
    },
  },

  // ── Application source (src/) ─────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      // ── Hard errors ──────────────────────────────────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // ── Intentionally silenced ───────────────────────────────────────────
      // HMR-only hint; irrelevant in CI.
      'react-refresh/only-export-components': 'off',
      // setState inside effects is intentional (auth guards, MediaQuery sync,
      // async data loading). One-shot or event-driven — not cascading renders.
      'react-hooks/set-state-in-effect': 'off',
      // immutability aspirational; off until Immer/Zustand patterns adopted.
      'react-hooks/immutability': 'off',
    },
  },
])
