import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.{ts,tsx}', 'agent/**/*.test.ts'], environment: 'node' },
});
