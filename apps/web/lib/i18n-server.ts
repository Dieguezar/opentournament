import 'server-only';

import { cookies, headers } from 'next/headers';
import {
  getDictionary,
  LOCALE_COOKIE,
  resolveLocale,
  type Dictionary,
  type Locale,
} from '@/lib/i18n';

export async function getRequestLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookieLocale) return resolveLocale(cookieLocale);

  return resolveLocale((await headers()).get('accept-language'));
}

export async function getRequestDictionary(): Promise<Dictionary> {
  return getDictionary(await getRequestLocale());
}
