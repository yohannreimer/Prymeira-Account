import { ClerkProvider } from "@clerk/clerk-react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { clerkPublishableKey } from "./runtime-config";

const root = document.getElementById("root");

function MissingConfig() {
  return (
    <main className="missing-config">
      <strong>Configure VITE_CLERK_PUBLISHABLE_KEY</strong>
      <span>O Hub precisa da publishable key do Clerk para autenticar o usuario.</span>
    </main>
  );
}

if (!root) {
  throw new Error("Root element not found.");
}

createRoot(root).render(
  clerkPublishableKey ? (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <App />
    </ClerkProvider>
  ) : (
    <MissingConfig />
  )
);
