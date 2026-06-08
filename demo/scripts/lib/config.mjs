import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

export function resolveFromRepoRoot(relativePath) {
  return path.resolve(repoRoot, relativePath);
}

export function validateDemoConfig(config) {
  if (!config || !Array.isArray(config.services)) {
    throw new Error("Demo config must contain a services array.");
  }

  const seenPorts = new Map();
  for (const service of config.services) {
    for (const key of ["id", "name", "cwd", "command", "healthUrl"]) {
      if (typeof service[key] !== "string" || service[key].trim() === "") {
        throw new Error(`Demo service is missing ${key}.`);
      }
    }
    if (!Array.isArray(service.args)) {
      throw new Error(`Demo service ${service.id} args must be an array.`);
    }
    if (!Array.isArray(service.ports) || service.ports.length === 0) {
      throw new Error(`Demo service ${service.id} ports must be a non-empty array.`);
    }
    for (const port of service.ports) {
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid demo port ${port}.`);
      }
      if (seenPorts.has(port)) {
        throw new Error(`Duplicate demo port ${port} for ${service.id} and ${seenPorts.get(port)}.`);
      }
      seenPorts.set(port, service.id);
    }
  }

  return config;
}

export function loadDemoConfig(configPath = resolveFromRepoRoot("demo/ecosystem.config.json")) {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const config = validateDemoConfig(parsed);
  return {
    ...config,
    pidFile: resolveFromRepoRoot(config.pidFile ?? "demo/.demo-processes.json"),
    services: config.services.map((service) => ({
      ...service,
      absoluteCwd: resolveFromRepoRoot(service.cwd),
      env: service.env ?? {}
    }))
  };
}

export function loadDemoUser(userPath = resolveFromRepoRoot("demo/demo-user.json")) {
  return JSON.parse(fs.readFileSync(userPath, "utf8"));
}
