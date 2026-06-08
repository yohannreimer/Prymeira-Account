import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

function runScript(scriptName, env = {}) {
  return spawnSync(process.execPath, [`demo/scripts/${scriptName}.mjs`], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
}

test("demo script entrypoints load without module errors", () => {
  for (const scriptName of ["start-all", "stop-all", "reset-all", "healthcheck-all"]) {
    const result = runScript(scriptName, { DEMO_DRY_RUN: "true" });
    assert.doesNotMatch(result.stderr, /MODULE_NOT_FOUND/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
  }
});

test("start-all dry run validates config without starting services", () => {
  const result = runScript("start-all", { DEMO_DRY_RUN: "true" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Dry run enabled/);
  assert.match(result.stdout, /account-api/);
});

test("reset-all dry run prints configured reset commands", () => {
  const result = runScript("reset-all", { DEMO_DRY_RUN: "true" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /plataforma-modular/);
  assert.match(result.stdout, /npm run demo:reset/);
});

test("stop-all handles a missing pid file safely", () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "prymeira-demo-"));
  const configPath = path.join(tempDir, "ecosystem.config.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      pidFile: path.join(tempDir, "missing-pids.json"),
      services: [
        {
          id: "one",
          name: "One",
          cwd: ".",
          command: "npm",
          args: ["run", "dev"],
          ports: [6501],
          healthUrl: "http://localhost:6501",
          env: {}
        }
      ]
    })
  );

  const result = runScript("stop-all", { DEMO_CONFIG_PATH: configPath });
  rmSync(tempDir, { recursive: true, force: true });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /No tracked demo processes/);
});

test("root test script includes demo tests", () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

  assert.match(packageJson.scripts["test:demo"], /node --test/);
  assert.match(packageJson.scripts.test, /test:demo/);
});
