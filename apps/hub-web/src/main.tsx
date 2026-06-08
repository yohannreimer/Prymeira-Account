import { ClerkProvider } from "@clerk/clerk-react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadClerkPublishableKey } from "./runtime-config";
import { shouldRenderPublicLanding } from "./public-routing";

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

const rootRenderer = createRoot(root);
const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

if (shouldRenderPublicLanding(window.location) || isDemoMode) {
  rootRenderer.render(<App />);
} else {
  void loadClerkPublishableKey().then((publishableKey) => {
    rootRenderer.render(
      publishableKey ? (
        <ClerkProvider publishableKey={publishableKey}>
          <App />
        </ClerkProvider>
      ) : (
        <MissingConfig />
      )
    );
  });
}
