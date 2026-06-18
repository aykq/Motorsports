import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendNewUserDiscordNotification } from "./discord";

const devProviders =
  process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_LOGIN === "1"
    ? await (async () => {
        const { default: CredentialsDev } = await import("next-auth/providers/credentials");
        const { eq: eqDev } = await import("drizzle-orm");
        return [
          CredentialsDev({
            id: "dev-credentials",
            credentials: { email: { label: "E-posta", type: "email" } },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              const email = String(credentials.email);
              let user = await db.query.users.findFirst({ where: eqDev(users.email, email) });
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
                  .where(eqDev(users.id, user.id))
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
      authorization: { params: { prompt: "select_account" } },
    }),
    Nodemailer({
      server: {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER ?? "",
          pass: process.env.EMAIL_APP_PASSWORD ?? "",
        },
      },
      from: `MSHub <${process.env.EMAIL_USER ?? ""}>`,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { createTransport } = await import("nodemailer");
        const transport = createTransport(provider.server as object);

        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, email),
          columns: { status: true },
        });
        const isReturning = existingUser?.status === "approved";

        const subject = isReturning ? "MSHub — Giriş Bağlantınız" : "MSHub — Hesabınız Onaylandı";
        const heading = isReturning ? "Giriş Yapın" : "Hesabınız Onaylandı";
        const body = isReturning
          ? "Hesabınıza giriş yapmak için aşağıdaki butona tıklayın."
          : "Hesabınız onaylandı. Aşağıdaki butona tıklayarak giriş yapabilirsiniz.";
        const textBody = isReturning
          ? `Hesabınıza giriş yapmak için aşağıdaki bağlantıya tıklayın:\n\n${url}\n\nBağlantı 24 saat geçerlidir.`
          : `Hesabınız onaylandı. Giriş yapmak için aşağıdaki bağlantıya tıklayın:\n\n${url}\n\nBağlantı 24 saat geçerlidir.`;

        const footerNote = "Bu bağlantı 24 saat geçerlidir. Eğer bu isteği siz yapmadıysanız görmezden gelebilirsiniz.";
        const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="padding:40px 16px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
      <div style="background:#0f172a;padding:28px 32px">
        <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">MSHub</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:3px">Motorsports takip platformu</div>
      </div>
      <div style="padding:36px 32px">
        <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;line-height:1.3">${heading}</h2>
        <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 32px">${body}</p>
        <a href="${url}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.01em">Giriş Yap</a>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #f1f5f9">
        <p style="font-size:11px;color:#94a3b8;margin:0;line-height:1.6">${footerNote}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

        await transport.sendMail({
          to: email,
          from: provider.from,
          subject,
          text: textBody,
          html,
        });
      },
    }),
    Credentials({
      id: "pending-approval",
      credentials: { userId: {} },
      authorize: async ({ userId }) => {
        if (!userId || typeof userId !== "string") return null;
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { id: true, email: true, name: true, image: true, status: true },
        });
        if (!user || user.status !== "approved") return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    ...devProviders,
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Google profil bilgilerini güncelle
      if (account?.provider === "google" && user.id && profile) {
        const update: { image?: string; name?: string } = {};
        if (profile.picture && user.image !== profile.picture) update.image = profile.picture as string;
        if (profile.name && user.name !== profile.name) update.name = profile.name as string;
        if (Object.keys(update).length > 0) {
          await db.update(users).set(update).where(eq(users.id, user.id));
        }
      }

      // İlk girişte admin emaili ise admin rolü ver ve direkt onayla
      if (isNewUser && user.email === process.env.ADMIN_EMAIL && user.id) {
        await db
          .update(users)
          .set({ role: "admin", status: "approved" })
          .where(eq(users.id, user.id));
      }

      // nodemailer ve pending-approval için bildirim gönderilmez
      if (account?.provider === "nodemailer" || account?.provider === "pending-approval") return;
      // dev-credentials için de bildirim gönderilmez
      if (account?.provider === "dev-credentials") return;

      // Yeni kullanıcı kaydında Discord bildirimi
      if (isNewUser && user.id && account?.provider) {
        try {
          await sendNewUserDiscordNotification({
            userId: user.id,
            name: user.name ?? null,
            email: user.email ?? null,
            provider: account.provider,
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
