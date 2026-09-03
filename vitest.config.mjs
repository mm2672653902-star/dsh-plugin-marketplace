import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['plugins/*/test/**/*.test.{js,mjs}', 'test/**/*.test.{js,mjs}'],
    environment: 'node',
  },
})
