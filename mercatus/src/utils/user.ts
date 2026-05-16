import { colors } from '../theme/colors';

export function uColor(name: string): string {
  const cols = [colors.green, '#1565C0', '#6A1B9A', colors.orange, '#AD1457', '#00838F'];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return cols[Math.abs(h) % cols.length];
}
