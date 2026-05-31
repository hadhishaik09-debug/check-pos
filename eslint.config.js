import { defineConfig } from 'eslint/config'

export default [
  { ignores: ['dist', 'dev-dist', 'public', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react-hooks/recommended',
      'plugin:react-refresh/recommended',
    ],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window: true, document: true },
    },
    env: { browser: true },
  },
]
