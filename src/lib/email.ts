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

export async function sendApprovalEmail(to: string, name: string | null): Promise<void> {
  const displayName = name ?? to.split("@")[0];
  const loginUrl = `${appUrl()}/login`;
  await transport().sendMail({
    to,
    from: from(),
    subject: "MSHub — Hesabınız Onaylandı",
    text: `Merhaba ${displayName}, hesabınız onaylandı. Giriş yapmak için: ${loginUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:900;margin:0 0 8px">MSHub</h1>
        <p style="color:#6b7280;margin:0 0 32px;font-size:14px">Motorsports takip platformu</p>
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Hesabınız Onaylandı</h2>
        <p style="color:#374151;font-size:14px;margin:0 0 24px">
          Merhaba ${displayName},<br><br>
          Hesabınız onaylandı. Aşağıdaki butona tıklayarak giriş yapabilirsiniz.
        </p>
        <a href="${loginUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Giriş Yap
        </a>
        <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
          Bu mesajı siz talep etmediyseniz görmezden gelebilirsiniz.
        </p>
      </div>
    `,
  });
}

export async function sendUnblockedEmail(email: string): Promise<void> {
  const loginUrl = `${appUrl()}/login`;
  await transport().sendMail({
    to: email,
    from: from(),
    subject: "MSHub — Hesabınızın Engeli Kaldırıldı",
    text: `Hesabınıza erişim kısıtlaması kaldırıldı. Giriş yapmak için: ${loginUrl}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:900;margin:0 0 8px">MSHub</h1>
        <p style="color:#6b7280;margin:0 0 32px;font-size:14px">Motorsports takip platformu</p>
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">Hesabınızın Engeli Kaldırıldı</h2>
        <p style="color:#374151;font-size:14px;margin:0 0 24px">
          Hesabınıza erişim kısıtlaması kaldırıldı. Aşağıdaki butona tıklayarak giriş yapabilirsiniz.
        </p>
        <a href="${loginUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Giriş Yap
        </a>
        <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
          Bu mesajı siz talep etmediyseniz görmezden gelebilirsiniz.
        </p>
      </div>
    `,
  });
}
