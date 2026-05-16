import type { Lang } from '../types/navigation';

export function tr(lang: Lang, en: string, ua: string): string {
  return lang === 'ua' ? ua : en;
}
