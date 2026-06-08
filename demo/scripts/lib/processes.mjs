import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export function isDryRun() {
  return process.env.DEMO_DRY_RUN === "true";
}

export async function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function assertPortsAvailable(services) {
  for (const service of services) {
    for (const port of service.ports) {
      const available = await checkPortAvailable(port);
      if (!available) {
        throw new Error(`Porta ${port} ocupada por outro processo. Pare o processo atual ou altere demo/ecosystem.config.json.`);
      }
    }
  }
}

export function runCommand(command, { cwd, env = {}, dryRun = false } = {}) {
  if (dryRun) {
    return Promise.resolve({ command, code: 0 });
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve({ command, code });
        return;
      }
      reject(new Error(`Command failed with exit code ${code}: ${command}`));
    });
  });
}

export async function runResetCommands(services, { dryRun = false } = {}) {
  const resetServices = services.filter((service) => service.resetCommand);
  if (resetServices.length === 0) {
    console.log("No demo reset commands configured.");
    return;
  }

  for (const service of resetServices) {
    console.log(`${dryRun ? "[dry-run] " : ""}${service.id}: ${service.resetCommand}`);
    await runCommand(service.resetCommand, {
      cwd: service.absoluteCwd,
      env: service.env,
      dryRun
    });
  }
}

export function startServices(services) {
  const entries = [];
  for (const service of services) {
    const child = spawn(service.command, service.args, {
      cwd: service.absoluteCwd,
      env: { ...process.env, ...service.env },
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    entries.push({
      id: service.id,
      name: service.name,
      pid: child.pid,
      command: [service.command, ...service.args].join(" "),
      cwd: service.absoluteCwd,
      healthUrl: service.healthUrl
    });
  }
  return entries;
}

export function writePidFile(pidFile, entries) {
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  fs.writeFileSync(pidFile, JSON.stringify({ startedAt: new Date().toISOString(), processes: entries }, null, 2));
}

export function readPidFile(pidFile) {
  if (!fs.existsSync(pidFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(pidFile, "utf8"));
}

export function stopTrackedProcesses(pidFile) {
  const pidData = readPidFile(pidFile);
  if (!pidData || !Array.isArray(pidData.processes) || pidData.processes.length === 0) {
    console.log("No tracked demo processes to stop.");
    return [];
  }

  const stopped = [];
  for (const entry of pidData.processes) {
    if (!Number.isInteger(entry.pid)) {
      continue;
    }
    try {
      process.kill(entry.pid, "SIGTERM");
      stopped.push(entry);
      console.log(`Stopped ${entry.id} (${entry.pid}).`);
    } catch (error) {
      if (error.code === "ESRCH") {
        console.log(`${entry.id} (${entry.pid}) was not running.`);
      } else {
        throw error;
      }
    }
  }
  fs.rmSync(pidFile, { force: true });
  return stopped;
}

export async function checkHealth(services, { dryRun = false, timeoutMs = 3000 } = {}) {
  const results = [];
  for (const service of services) {
    if (dryRun) {
      results.push({ service, ok: true, status: "dry-run" });
      continue;
    }

    try {
      const response = await fetch(service.healthUrl, {
        signal: AbortSignal.timeout(timeoutMs)
      });
      results.push({ service, ok: response.ok, status: response.status });
    } catch (error) {
      results.push({ service, ok: false, status: error.message });
    }
  }
  return results;
}
