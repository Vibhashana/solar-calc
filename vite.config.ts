import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Required for @testing-library/react's auto-cleanup: it only registers
    // its afterEach(cleanup) hook when it finds a global `afterEach`, which
    // only exists when `globals: true` is set. Without it, DOM from earlier
    // tests in the same file leaks into later ones (confirmed: the second
    // DesignDump test failed with "multiple elements ... Panels" until this
    // was added).
    globals: true,
  },
})
