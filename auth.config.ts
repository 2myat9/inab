import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const authConfig = {
  providers: [Google],
  pages: { signIn: "/signin" },
  callbacks: {
    // Fail closed: nobody signs in until ALLOWED_EMAILS is configured.
    signIn({ user }) {
      const email = user.email?.toLowerCase();
      return !!email && allowedEmails.includes(email);
    },
    // Without a DB adapter, Auth.js mints a random UUID as user.id on every
    // sign-in. All rows are keyed by token.sub, so pin it to the provider's
    // stable account id (Google's `sub`) instead.
    jwt({ token, account }) {
      if (account) token.sub = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
} satisfies NextAuthConfig;
