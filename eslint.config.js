import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Serverless API routes + dev scripts run on Node, not the browser.
  {
    files: ['api/**/*.js', 'scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
  },
  // react-three-fiber scenes are inherently imperative — the render loop mutates
  // Three.js objects (uniforms, transforms) every frame, which is the intended
  // pattern, not a bug. The React Compiler immutability/ref rules don't model
  // this, so we relax them for the WebGL scene only.
  {
    files: [
      'src/design/atmosphere/SkyCanvas.jsx',
      'src/components/Cortex/NeuralWebCanvas.jsx',
    ],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
    },
  },
])
