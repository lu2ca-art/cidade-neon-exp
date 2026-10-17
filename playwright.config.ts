import { defineConfig } from "@playwright/test"

const porta = process.env.PORTA ?? "3100"

export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${porta}`,
    viewport: { width: 400, height: 844 },
    launchOptions: {
      executablePath: process.env.CHROME_PATH || undefined,
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
    },
  },
  webServer: {
    command: `bun run start -p ${porta}`,
    url: `http://localhost:${porta}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
})
