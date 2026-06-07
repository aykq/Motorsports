import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

const devProviders =
  process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_LOGIN === "1"
    ? await (async () => {
        const { default: Credentials } = await import("next-auth/providers/credentials");
        const { eq } = await import("drizzle-orm");
        return [
          Credentials({
            credentials: { email: { label: "E-posta", type: "email" } },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              const email = String(credentials.email);
              let user = await db.query.users.findFirst({ where: eq(users.email, email) });
              if (!user) {
                const [created] = await db
                  .insert(users)
                  .values({ email, name: email.split("@")[0] })
                  .returning();
                user = created;
              }
              return user;
            },
          }),
        ];
      })()
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
    ...devProviders,
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
