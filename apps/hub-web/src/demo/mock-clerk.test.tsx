import { describe, expect, it } from "vitest";
import { useAuth, useUser } from "./mock-clerk";

describe("mock Clerk demo auth", () => {
  it("returns the local demo auth token and user identity", async () => {
    const auth = useAuth();
    const { user } = useUser();

    await expect(auth.getToken()).resolves.toBe("demo-token");
    expect(useAuth().getToken).toBe(auth.getToken);
    expect(auth.isLoaded).toBe(true);
    expect(auth.isSignedIn).toBe(true);
    expect(user.id).toBe("demo_user");
    expect(user.primaryEmailAddress?.emailAddress).toBe("demo@prymeira.local");
  });
});
