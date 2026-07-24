import { resolve } from 'node:path'
import { defineConfig } from '@playwright/test'

const guiRoot = resolve(__dirname, '../..')
const viteEntry = resolve(guiRoot, '../../node_modules/vite/bin/vite.js')
const viteConfig = resolve(__dirname, 'vite.config.ts')

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4187',
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node "${viteEntry}" --config "${viteConfig}" --host 127.0.0.1`,
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
