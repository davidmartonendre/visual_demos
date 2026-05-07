import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,        // sequential is faster for small suites + dev server
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',     // adjust per stack: 'pnpm dev', 'yarn dev', 'bun run dev'
    url: 'http://localhost:3000',
    reuseExistingServer: true,  // sandbox might already have it running
    timeout: 120_000,
  },
});
