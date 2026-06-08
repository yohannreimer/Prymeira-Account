#!/usr/bin/env node
import { loadDemoConfig } from "./lib/config.mjs";
import { isDryRun, stopTrackedProcesses } from "./lib/processes.mjs";

const config = loadDemoConfig(process.env.DEMO_CONFIG_PATH);
stopTrackedProcesses(config.pidFile, config.services, { dryRun: isDryRun() });
