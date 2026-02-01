module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended'],
  overrides: [
    {
      files: ['src/reference-game/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/engine/**', '**/engine'],
                message: 'Reference game must not import from engine. Use src/types.ts for shared contracts.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/engine/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/reference-game/**', '**/reference-game'],
                message: 'Engine must not import from reference-game. Use src/types.ts for shared contracts.',
              },
            ],
          },
        ],
      },
    },
  ],
}
