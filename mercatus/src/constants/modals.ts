import type { IcoName } from '../types/navigation';

export const CANCEL_REASONS_UA = [
  'Не зʼявився',
  'Відмовився',
  'Інший товар',
  'Спроба обману',
  'Небезпека',
  'Інша причина',
];
export const CANCEL_REASONS_EN = [
  'Didn\'t show up',
  'Refused deal',
  'Wrong item',
  'Scam attempt',
  'Felt unsafe',
  'Other',
];
export const CANCEL_IDS = ['noshow', 'refused', 'wrongitem', 'scam', 'unsafe', 'other'];
export const CANCEL_ICONS: IcoName[] = [
  'glasses-outline',
  'ban-outline',
  'cube-outline',
  'skull-outline',
  'warning-outline',
  'help-circle-outline',
];

export const REPORT_IDS = ['scam', 'noshow', 'wrongitem', 'rude', 'fake'];
export const REPORT_LABELS_UA = ['Обманув', 'Не зʼявився', 'Інший товар', 'Грубість', 'Фейк'];
export const REPORT_LABELS_EN = ['Scam', 'No show', 'Wrong item', 'Rude', 'Fake profile'];
export const REPORT_ICONS: IcoName[] = [
  'skull-outline',
  'glasses-outline',
  'cube-outline',
  'alert-circle-outline',
  'person-outline',
];
