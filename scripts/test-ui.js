// Own the fixture process directly: Playwright's shell-based webServer teardown
// can leave its Node child alive on Windows after all tests have finished.
const { fork, spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fixture = fork(path.join(root, "tests", "ui-server.js"), [], {
  cwd: root,
  stdio: ["ignore", "inherit", "inherit", "ipc"],
});
let runner;
let stopping = false;
let exitCode = 1;
const startupTimer = setTimeout(() => {
  console.error("El servidor de pruebas no inició en 30 segundos.");
  stop(1);
}, 30000);

function stop(code) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  clearTimeout(startupTimer);
  if (runner && runner.exitCode === null && runner.signalCode === null) runner.kill();
  if (fixture.exitCode !== null || fixture.signalCode !== null) {
    process.exitCode = exitCode;
    return;
  }
  if (fixture.connected) fixture.send({ type: "stop" });
  else fixture.kill();
  const timeout = setTimeout(() => {
    console.error("El servidor de pruebas no respondió al cierre; se terminó su proceso.");
    exitCode = exitCode || 1;
    fixture.kill();
  }, 10000);
  timeout.unref();
  fixture.once("exit", () => clearTimeout(timeout));
}

fixture.on("message", message => {
  if (message?.type !== "ready" || runner || stopping) return;
  clearTimeout(startupTimer);
  runner = spawn(process.execPath, [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)], {
    cwd: root,
    env: { ...process.env, UI_TEST_MANAGED_SERVER: "1" },
    stdio: "inherit",
  });
  runner.on("error", error => {
    console.error("No se pudo iniciar Playwright:", error.message);
    stop(1);
  });
  runner.on("exit", (code, signal) => stop(code ?? (signal === "SIGINT" ? 130 : 1)));
});
fixture.on("error", error => {
  console.error("No se pudo iniciar el servidor de pruebas:", error.message);
  stop(1);
});
fixture.on("exit", code => {
  if (!stopping) {
    console.error("El servidor de pruebas terminó antes de completar la ejecución.");
    stop(code || 1);
  }
  process.exitCode = code ? (exitCode || code) : exitCode;
});
process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));
