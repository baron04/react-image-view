// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    // Build output, coverage, and vendored/generated files — none of these
    // are hand-written, so linting them either wastes time or fights tools
    // that already own their own formatting.
    ignores: [
      'dist/**',
      'docs-site/dist/**',
      'docs-site/.astro/**',
      'docs-site/public/r/**',
      // The docs apps carry their own lint setup and their own build output;
      // linting either from the root just reports on generated bundles.
      'docs-next/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'media/**',
      '.claude/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The new JSX transform (React 17+, used throughout this project)
      // never needs React in scope just to write JSX.
      'react/react-in-jsx-scope': 'off',
      // Every asChild-supporting part in this codebase intentionally reads
      // props off children without declaring prop-types — the actual
      // contract lives in TypeScript, which this rule can't see.
      'react/prop-types': 'off',

      // core/ and the gesture reducer lean on this: an unused destructured
      // element (`const [a, , c] = xs`) or a deliberately-ignored catch
      // binding shouldn't be an error, only a genuinely unused *named*
      // binding should.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // The gesture machine and animation drivers are written with explicit
      // return types on every exported function already; this project's own
      // style, not a rule that needs enforcing separately.
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  {
    // Tests read fixtures and synthetic data through `any` in a few spots
    // (constructing malformed events on purpose); that's the point of a
    // test, not a lint violation.
    files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    // The playground and scripts/ are throwaway harnesses, not shipped
    // code — real console usage and looser typing are expected there.
    files: ['playground/**/*.{ts,tsx}', 'scripts/**/*.{ts,mjs}'],
    // Both globals on purpose: the Playwright scripts run in Node, but the
    // callbacks they pass to page.evaluate/waitForFunction are serialised and
    // executed in the browser, where `document` is exactly right.
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-console': 'off',
    },
  },

  {
    // Astro's own config file runs under Node, not a browser or React —
    // `process.env` is exactly how it picks the GitHub Pages base path.
    files: ['docs-site/astro.config.mjs'],
    languageOptions: { globals: globals.node },
  },

  // Must be last: turns off every stylistic rule Prettier already owns, so
  // the two tools never disagree about formatting.
  prettierConfig,
)
