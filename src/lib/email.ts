import { Resend } from "resend";

export async function sendApprovalEmail(to: string, name: string | null) {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const displayName = name ?? to.split("@")[0];

  await resend.emails.send({
    from: "MSHub <noreply@mshub.aykq.org.tr>",
    to,
    subject: "Hesabınız onaylandı — MSHub",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
        <div style="margin-bottom:24px;">
          <span style="font-size:28px;font-weight:900;color:#e11d48;">MS</span><span style="font-size:28px;font-weight:900;color:#111827;">Hub</span>
        </div>
        <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Hesabınız onaylandı</h2>
        <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">
          Merhaba ${displayName},<br><br>
          MSHub hesabınız onaylandı. Aşağıdaki butona tıklayarak uygulamaya giriş yapabilirsiniz.
        </p>
        <a href="${appUrl}" style="display:inline-block;background:#e11d48;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Uygulamaya Git →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#9ca3af;">
          Bu e-postayı beklemiyorsanız görmezden gelebilirsiniz.
        </p>
      </div>
    `,
  });
}
