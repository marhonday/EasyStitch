import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Pure Node environment — no browser APIs needed for the tested modules.
    // resize.ts and canvasRenderer.ts use canvas and are excluded from this suite.
    // They would need a separate integration test suite with jsdom + canvas mock.
    environment: 'node',

    // Inject describe/test/expect/vi as globals — no import needed in test files.
    // tsconfig.json references "vitest/globals" to keep tsc happy with these names.
    globals: true,

    // Match the existing test file location
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],

    // Exclude files that require a browser environment
    exclude: [
      'node_modules',
      'src/**/__tests__/**/*.browser.test.ts',
    ],

    // Show per-test timing in verbose mode
    reporters: ['verbose'],

    // Coverage is off by default — run with --coverage to enable
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/modules/**/*.ts'],
      exclude: [
        'src/modules/**/__tests__/**',
        'src/modules/image-processing/resize.ts',     // browser canvas
        'src/modules/preview-rendering/canvasRenderer.ts', // browser canvas
        'src/modules/pdf-export/**',                  // @react-pdf renderer
      ],
    },
  },

  resolve: {
    alias: {
      // Mirror the @/* path alias from tsconfig.json
      '@': path.resolve(__dirname, './src'),
    },
  },
})
