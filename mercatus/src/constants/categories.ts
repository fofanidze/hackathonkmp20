import { colors } from '../theme/colors';

export const RES_EN = [
  'Water',
  'Batteries',
  'Medicine',
  'Fuel',
  'Food',
  'Tools',
  'Clothing',
  'Hygiene',
  'Signal',
  'Transport',
  'First Aid',
  'Baby Items',
];
export const RES_UA = [
  'Вода',
  'Батарейки',
  'Ліки',
  'Пальне',
  'Їжа',
  'Інструменти',
  'Одяг',
  'Гігієна',
  'Зв\'язок',
  'Транспорт',
  'Перша допомога',
  'Дитячі',
];
export const CHAIN = [colors.green, colors.blue, colors.purple, colors.orange];

export const CAT_ICONS: Record<string, string> = {
  Water: 'water-outline',
  Batteries: 'battery-half-outline',
  Medicine: 'medkit-outline',
  Fuel: 'flame-outline',
  Food: 'nutrition-outline',
  Tools: 'build-outline',
  Clothing: 'shirt-outline',
  Hygiene: 'hand-left-outline',
  Signal: 'wifi-outline',
  Transport: 'car-outline',
  'First Aid': 'bandage-outline',
  'Baby Items': 'people-outline',
};

export const URG: Record<
  string,
  { color: string; bg: string; label: string; labelUa: string }
> = {
  low: { color: '#2E7D32', bg: '#E8F5E9', label: 'Low', labelUa: 'Низька' },
  medium: { color: '#E65100', bg: '#FFF4E5', label: 'Medium', labelUa: 'Середня' },
  critical: { color: '#C62828', bg: '#FFF0F3', label: 'Critical', labelUa: 'Критична' },
};
