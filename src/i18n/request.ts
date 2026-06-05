import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const locales = ["tr", "en"] as const;
const defaultLocale = "tr";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value ?? defaultLocale;
  const locale = (locales as readonly string[]).includes(raw) ? raw : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
