import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const appDir = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(appDir, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, ["VITE_", "CLERK_PUBLISHABLE_KEY", "PRYMEIRA_ACCOUNT_API_URL"]);
  const isDemoMode = (process.env.VITE_DEMO_MODE ?? env.VITE_DEMO_MODE) === "true";
  const demoAlias = isDemoMode
    ? {
        resolve: {
          alias: {
            "@clerk/clerk-react": resolve(appDir, "src/demo/mock-clerk.tsx")
          }
        }
      }
    : {};

  return {
    plugins: [react()],
    envDir,
    envPrefix: ["VITE_", "CLERK_PUBLISHABLE_KEY", "PRYMEIRA_ACCOUNT_API_URL"],
    ...demoAlias,
    server: {
      port: 5175
    },
    preview: {
      port: 4174
    }
  };
});
