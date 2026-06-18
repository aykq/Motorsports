import { createApprovalToken } from "./admin-token";

interface NewUserNotificationData {
  userId: string;
  name: string | null;
  email: string | null;
  provider: string;
  image: string | null;
  signupAt: Date;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google OAuth",
  nodemailer: "E-posta (Magic Link)",
};

export async function sendNewUserDiscordNotification(data: NewUserNotificationData) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const token = createApprovalToken(data.userId);
  const approvalUrl = `${appUrl}/admin/approve?token=${token}`;
  const providerLabel = PROVIDER_LABELS[data.provider] ?? data.provider;

  const body = {
    embeds: [
      {
        title: "🔔 Yeni Kullanıcı Kayıt İsteği",
        color: 0xe11d48,
        description: `[✅ Onay sayfasını aç →](${approvalUrl})`,
        fields: [
          { name: "👤 İsim", value: data.name ?? "—", inline: true },
          { name: "📧 E-posta", value: data.email ?? "—", inline: true },
          { name: "🔑 Provider", value: providerLabel, inline: true },
        ],
        ...(data.image ? { thumbnail: { url: data.image } } : {}),
        footer: { text: "MSHub Admin" },
        timestamp: data.signupAt.toISOString(),
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status}`);
  }
}
