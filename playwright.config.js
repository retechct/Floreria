const { defineConfig } = require("@playwright/test");
const port = Number(process.env.UI_TEST_PORT || 3011);
module.exports = defineConfig({
  testDir: "./tests/browser", workers: 1, timeout: 90000,
  use: { baseURL: `http://127.0.0.1:${port}`, channel: "msedge", headless: true, trace: "retain-on-failure" },
  webServer: { command: "node tests/ui-server.js", url: `http://127.0.0.1:${port}/api/health`, reuseExistingServer: false },
});
