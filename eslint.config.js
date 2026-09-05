export default [
  {
    files: ['admin/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        window: 'readonly', document: 'readonly', location: 'readonly',
        localStorage: 'readonly', sessionStorage: 'readonly', navigator: 'readonly',
        console: 'readonly', fetch: 'readonly', setTimeout: 'readonly',
        clearTimeout: 'readonly', URL: 'readonly', Blob: 'readonly', File: 'readonly',
        FormData: 'readonly', Node: 'readonly', Element: 'readonly', CSS: 'readonly',
        DOMParser: 'readonly', NodeFilter: 'readonly', getComputedStyle: 'readonly', createImageBitmap: 'readonly',
        alert: 'readonly', confirm: 'readonly', prompt: 'readonly',
        URLSearchParams: 'readonly', AbortController: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-undef': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
];
