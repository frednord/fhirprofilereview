import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    // Enforces the dependency direction from CLAUDE.md: core must stay
    // independent of UI and integrations so it can be reused from a CLI and tests.
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/**', '**/integrations/**', '**/pages/**', '**/hooks/**', 'react', 'react-dom'],
              message: 'src/core får inte bero på UI, React eller integrationer.',
            },
          ],
        },
      ],
    },
  },
)
