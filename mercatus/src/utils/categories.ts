import { CAT_ICONS } from '../constants/categories';

export function catIcon(item: string): string {
  return CAT_ICONS[item] ?? 'cube-outline';
}
