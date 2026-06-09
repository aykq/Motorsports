import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendNewUserDiscordNotification } from "./discord";

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
                  .values({ email, name: email.split("@")[0], status: "approved" })
                  .returning();
                user = created;
              } else if (user.status !== "approved") {
                const [updated] = await db
                  .update(users)
                  .set({ status: "approved" })
                  .where(eq(users.id, user.id))
                  .returning();
                user = updated;
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
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? "",
      from: "MSHub <noreply@mshub.aykq.org.tr>",
    }),
    ...devProviders,
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (account?.provider === "google" && user.id && profile) {
        const update: { image?: string; name?: string } = {};
        if (profile.picture && user.image !== profile.picture) update.image = profile.picture as string;
        if (profile.name && user.name !== profile.name) update.name = profile.name as string;
        if (Object.keys(update).length > 0) {
          await db.update(users).set(update).where(eq(users.id, user.id));
        }
      }

      if (isNewUser && user.id && account?.provider !== "credentials") {
        try {
          await sendNewUserDiscordNotification({
            userId: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            provider: account?.provider ?? "unknown",
            image: user.image ?? null,
            signupAt: new Date(),
          });
        } catch (err) {
          console.error("Discord notification failed:", err);
        }
      }
    },
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { status: true },
      });
      if (dbUser?.status === "blocked") return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.image) token.picture = user.image;
        if (user.name) token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.picture) session.user.image = token.picture as string;
      if (token.name) session.user.name = token.name as string;
      return session;
    },
  },
});
