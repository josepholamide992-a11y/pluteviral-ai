import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:19006',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npx expo start --web --port 19006',
    url: 'http://127.0.0.1:19006',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
    },
  },
});
