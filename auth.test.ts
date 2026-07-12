import { describe, expect, test } from "vitest";
import type { Account, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { authConfig } from "./auth.config";

// Without a database adapter, Auth.js mints a random UUID as the user id on
// every OAuth sign-in, so token.sub (which keys all our data) changes each
// time. The jwt callback must pin token.sub to the provider's stable account
// id instead.
describe("jwt callback", () => {
  const user: User = { id: "d8a74d32-random-uuid", email: "me@example.com" };

  test("sets token.sub to the provider account id on sign-in", () => {
    const token: JWT = { sub: "89386ee9-c3a0-4f8e-8f2a-5eab6f7e0898" };
    const account = {
      provider: "google",
      type: "oidc",
      providerAccountId: "115234567890123456789",
    } as Account;

    const result = authConfig.callbacks.jwt({ token, account, user });

    expect(result.sub).toBe("115234567890123456789");
  });

  test("keeps existing token.sub on requests after sign-in", () => {
    const token: JWT = { sub: "115234567890123456789" };

    const result = authConfig.callbacks.jwt({ token, account: null, user });

    expect(result.sub).toBe("115234567890123456789");
  });
});
