#!/usr/bin/env node
import { loadDemoConfig } from "./lib/config.mjs";
import { isDryRun, runResetCommands } from "./lib/processes.mjs";

const config = loadDemoConfig(process.env.DEMO_CONFIG_PATH);
await runResetCommands(config.services, { dryRun: isDryRun() });
