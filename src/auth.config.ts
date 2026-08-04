import type { NextAuthConfig, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.role = user.role ?? "user";
        token.status = user.status ?? "pending";
        token.language = user.language ?? null;
        token.theme = user.theme ?? null;

        if (user.email === process.env.ADMIN_EMAIL) {
          token.role = "admin";
          token.status = "approved";
        }
      }
      return token;
    },
    session({ session, token }: { session: Session; token: JWT }) {
      if (token.role) session.user.role = token.role;
      if (token.status) session.user.status = token.status;
      session.user.language = token.language ?? null;
      session.user.theme = token.theme ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
