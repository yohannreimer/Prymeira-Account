import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../..",
  envPrefix: ["VITE_", "CLERK_PUBLISHABLE_KEY", "PRYMEIRA_ACCOUNT_API_URL"],
  server: {
    port: 5175
  },
  preview: {
    port: 4174
  }
});
