const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/browser", workers: 1, timeout: 90000,
  use: { baseURL: "http://127.0.0.1:3011", channel: "msedge", headless: true, trace: "retain-on-failure" },
  webServer: { command: "node tests/ui-server.js", url: "http://127.0.0.1:3011/api/health", reuseExistingServer: false },
});
