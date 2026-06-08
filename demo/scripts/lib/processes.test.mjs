import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { stopTrackedProcesses } from "./processes.mjs";

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

test("stopTrackedProcesses dry run does not kill or delete pid file", () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "prymeira-demo-"));
  const pidFile = path.join(tempDir, "demo-processes.json");
  const service = {
    id: "one",
    name: "One",
    command: "npm",
    args: ["run", "dev"],
    absoluteCwd: path.resolve(tempDir, "service")
  };
  const trackedCommand = "npm run dev";
  writeFileSync(
    pidFile,
    JSON.stringify({
      processes: [{ ...service, command: trackedCommand, pid: 12345, cwd: service.absoluteCwd }]
    })
  );

  let killCalled = false;
  const stopped = stopTrackedProcesses(pidFile, [service], {
    dryRun: true,
    killProcess: () => {
      killCalled = true;
    }
  });

  assert.deepEqual(stopped, []);
  assert.equal(killCalled, false);
  assert.equal(existsSync(pidFile), true);
  rmSync(tempDir, { recursive: true, force: true });
});

test("stopTrackedProcesses skips invalid pid values", () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "prymeira-demo-"));
  const pidFile = path.join(tempDir, "demo-processes.json");
  const service = {
    id: "one",
    name: "One",
    command: "npm",
    args: ["run", "dev"],
    absoluteCwd: path.resolve(tempDir, "service")
  };
  const trackedCommand = "npm run dev";
  writeFileSync(
    pidFile,
    JSON.stringify({
      processes: [
        { ...service, command: trackedCommand, pid: 0, cwd: service.absoluteCwd },
        { ...service, command: trackedCommand, pid: -1, cwd: service.absoluteCwd }
      ]
    })
  );

  let killCalled = false;
  const stopped = stopTrackedProcesses(pidFile, [service], {
    killProcess: (pid) => {
      killCalled = true;
      assert.equal(pid, -12345);
    }
  });

  assert.deepEqual(stopped, []);
  assert.equal(killCalled, false);
  assert.equal(existsSync(pidFile), false);
  rmSync(tempDir, { recursive: true, force: true });
});

test("stopTrackedProcesses skips stale metadata mismatch", () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "prymeira-demo-"));
  const pidFile = path.join(tempDir, "demo-processes.json");
  const service = {
    id: "one",
    name: "One",
    command: "npm",
    args: ["run", "dev"],
    absoluteCwd: path.resolve(tempDir, "current")
  };
  writeFileSync(
    pidFile,
    JSON.stringify({
      processes: [
        {
          id: "one",
          name: "One",
          command: "npm run other",
          cwd: path.resolve(tempDir, "stale"),
          pid: 12345
        }
      ]
    })
  );

  let killCalled = false;
  const stopped = stopTrackedProcesses(pidFile, [service], {
    killProcess: () => {
      killCalled = true;
    }
  });

  assert.deepEqual(stopped, []);
  assert.equal(killCalled, false);
  assert.equal(existsSync(pidFile), false);
  rmSync(tempDir, { recursive: true, force: true });
});

test("stopTrackedProcesses stops a valid tracked disposable process", async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "prymeira-demo-"));
  const pidFile = path.join(tempDir, "demo-processes.json");
  const args = ["-e", "setInterval(() => {}, 1000);"];
  const child = spawn(process.execPath, args, { cwd: tempDir, detached: true, stdio: "ignore" });
  const exited = new Promise((resolve) => child.once("exit", resolve));
  const service = {
    id: "one",
    name: "One",
    command: process.execPath,
    args,
    absoluteCwd: tempDir
  };

  writeFileSync(
    pidFile,
    JSON.stringify({
      processes: [
        {
          id: service.id,
          name: service.name,
          command: [service.command, ...service.args].join(" "),
          cwd: service.absoluteCwd,
          absoluteCwd: service.absoluteCwd,
          pid: child.pid
        }
      ]
    })
  );

  try {
    const stopped = stopTrackedProcesses(pidFile, [service]);
    const exitCode = await Promise.race([
      exited,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Disposable process did not stop.")), 3000))
    ]);

    assert.equal(stopped.length, 1);
    assert.equal(existsSync(pidFile), false);
    assert.notEqual(exitCode, undefined);
  } finally {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") {
        throw error;
      }
    }
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("root test script includes demo tests", () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

  assert.match(packageJson.scripts["test:demo"], /node --test/);
  assert.match(packageJson.scripts.test, /test:demo/);
});
