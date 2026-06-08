#!/usr/bin/env node
import { loadDemoConfig } from "./lib/config.mjs";
import { assertPortsAvailable, isDryRun, runResetCommands, startServices, writePidFile } from "./lib/processes.mjs";

const config = loadDemoConfig(process.env.DEMO_CONFIG_PATH);

if (isDryRun()) {
  console.log("Dry run enabled. Demo config is valid; no services will be started.");
  for (const service of config.services) {
    console.log(`${service.id}\t${service.healthUrl}\t${service.command} ${service.args.join(" ")}`);
  }
} else {
  await runResetCommands(config.services);
  await assertPortsAvailable(config.services);
  const entries = startServices(config.services);
  writePidFile(config.pidFile, entries);
  for (const entry of entries) {
    console.log(`started\t${entry.id}\tpid ${entry.pid}\t${entry.healthUrl}`);
  }
}
