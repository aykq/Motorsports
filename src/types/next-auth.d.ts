import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      status: string;
      language: string | null;
      theme: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    status: string;
    language: string | null;
    theme: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    status?: string;
    language?: string | null;
    theme?: string | null;
  }
}
