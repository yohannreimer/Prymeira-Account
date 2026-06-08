import type { ReactNode } from "react";

const demoUser = {
  id: "demo_user",
  firstName: "Usuario",
  lastName: "Demo",
  fullName: "Usuario Demo",
  primaryEmailAddress: {
    emailAddress: "demo@prymeira.local"
  }
};

const demoAuth = {
  isLoaded: true,
  isSignedIn: true,
  userId: demoUser.id,
  getToken: async () => "demo-token",
  signOut: async () => undefined
};

const demoUserState = {
  isLoaded: true,
  isSignedIn: true,
  user: demoUser
};

type ChildrenProps = {
  children?: ReactNode;
};

export function ClerkProvider({ children }: ChildrenProps) {
  return <>{children}</>;
}

export function ClerkLoading() {
  return null;
}

export function SignedIn({ children }: ChildrenProps) {
  return <>{children}</>;
}

export function SignedOut() {
  return null;
}

export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}

export function UserButton() {
  return <span aria-label="Usuario Demo" />;
}

export function useAuth() {
  return demoAuth;
}

export function useUser() {
  return demoUserState;
}
