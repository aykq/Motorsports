import type { Metadata, Viewport } from "next";
import { Inter, Saira_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { Providers } from "@/lib/providers";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

// Body / UI
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
// Display / headings — condensed, technical (motorsport DNA)
const saira = Saira_Condensed({
  variable: "--font-saira",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});
// Data / numbers / times — tabular instrument readout
const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Motorsports Hub",
    template: "%s | Motorsports Hub",
  },
  description: "F1, WEC, MotoGP ve daha fazlası — tüm otomobil sporu serileri tek bir yerde",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MS Hub",
  },
};

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${saira.variable} ${jbMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <ServiceWorkerRegistrar />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="motorsports-theme">
            <Providers>{children}</Providers>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
