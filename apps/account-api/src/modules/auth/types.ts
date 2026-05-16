export type AuthenticatedUser = {
  clerkUserId: string;
  email: string;
  name?: string;
};

export type AuthVerifier = {
  verifyBearerToken(authorizationHeader: string | undefined): Promise<AuthenticatedUser>;
};
