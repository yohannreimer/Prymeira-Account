#!/usr/bin/env node
import { loadDemoConfig } from "./lib/config.mjs";
import { checkHealth, isDryRun } from "./lib/processes.mjs";

const config = loadDemoConfig(process.env.DEMO_CONFIG_PATH);
const results = await checkHealth(config.services, { dryRun: isDryRun() });

for (const result of results) {
  console.log(`${result.ok ? "ok" : "fail"}\t${result.service.id}\t${result.service.healthUrl}\t${result.status}`);
}

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}
