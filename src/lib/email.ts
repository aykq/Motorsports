import { createTransport } from "nodemailer";

function transport() {
  return createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER ?? "",
      pass: process.env.EMAIL_APP_PASSWORD ?? "",
    },
  });
}

const from = () => `MSHub <${process.env.EMAIL_USER ?? ""}>`;
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://mshub.aykq.org.tr";

function buildEmailHtml(heading: string, body: string, buttonText: string, buttonUrl: string, footerNote: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="padding:40px 16px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

      <!-- Accent stripe -->
      <div style="height:4px;background:#dc2626"></div>

      <!-- Header -->
      <div style="background:#0f172a;padding:28px 32px">
        <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">MSHub</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:3px">Motorsports takip platformu</div>
      </div>

      <!-- Content -->
      <div style="padding:36px 32px">
        <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;line-height:1.3">${heading}</h2>
        <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 32px">${body}</p>
        <a href="${buttonUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.01em">${buttonText}</a>
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px;border-top:1px solid #f1f5f9">
        <p style="font-size:11px;color:#94a3b8;margin:0;line-height:1.6">${footerNote}</p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

export async function sendApprovalEmail(to: string, name: string | null): Promise<void> {
  const displayName = name ?? to.split("@")[0];
  const loginUrl = `${appUrl()}/login`;
  await transport().sendMail({
    to,
    from: from(),
    subject: "MSHub — Hesabınız Onaylandı",
    text: `Merhaba ${displayName}, hesabınız onaylandı. Giriş yapmak için: ${loginUrl}`,
    html: buildEmailHtml(
      "Hesabınız Onaylandı",
      `Merhaba ${displayName},<br><br>Hesabınız incelendi ve onaylandı. Artık platforma giriş yapabilirsiniz.`,
      "Giriş Yap",
      loginUrl,
      "Bu mesajı beklemiyorsanız görmezden gelebilirsiniz."
    ),
  });
}

export async function sendUnblockedEmail(email: string): Promise<void> {
  const loginUrl = `${appUrl()}/login`;
  await transport().sendMail({
    to: email,
    from: from(),
    subject: "MSHub — Hesabınızın Engeli Kaldırıldı",
    text: `Hesabınıza erişim kısıtlaması kaldırıldı. Giriş yapmak için: ${loginUrl}`,
    html: buildEmailHtml(
      "Hesabınızın Engeli Kaldırıldı",
      "Hesabınıza uygulanan erişim kısıtlaması kaldırıldı. Tekrar giriş yapabilirsiniz.",
      "Giriş Yap",
      loginUrl,
      "Bu mesajı beklemiyorsanız görmezden gelebilirsiniz."
    ),
  });
}
