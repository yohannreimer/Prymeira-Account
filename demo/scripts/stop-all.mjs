#!/usr/bin/env node
import { loadDemoConfig } from "./lib/config.mjs";
import { stopTrackedProcesses } from "./lib/processes.mjs";

const config = loadDemoConfig(process.env.DEMO_CONFIG_PATH);
stopTrackedProcesses(config.pidFile);
