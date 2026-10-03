// ESLint flat config (ESLint 9+). Foco em erros reais, não em estilo.
module.exports = [
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // Globais do navegador
        window: 'readonly', document: 'readonly', localStorage: 'readonly',
        location: 'readonly', history: 'readonly', navigator: 'readonly',
        Image: 'readonly', FileReader: 'readonly', setTimeout: 'readonly',
        console: 'readonly', URLSearchParams: 'readonly', matchMedia: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      eqeqeq: ['warn', 'smart'],
      'prefer-const': 'warn'
    }
  },
  {
    files: ['_test_app.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { require: 'readonly', module: 'readonly', __dirname: 'readonly', process: 'readonly', console: 'readonly', setTimeout: 'readonly' }
    },
    rules: { 'no-undef': 'error', 'no-unused-vars': 'warn' }
  }
];