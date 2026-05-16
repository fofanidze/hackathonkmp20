export function pd(s: string): Date {
  if (!s) return new Date();
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-', 10)) {
    return new Date(s + 'Z');
  }
  return new Date(s);
}

export function ago(d: string, ua: boolean): string {
  const diff = Date.now() - pd(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const dy = Math.floor(diff / 86400000);
  if (m < 1) return ua ? 'щойно' : 'just now';
  if (m < 60) return ua ? `${m} хв тому` : `${m}m ago`;
  if (h < 24) return ua ? `${h} год тому` : `${h}h ago`;
  if (dy === 1) return ua ? 'вчора' : 'yesterday';
  return ua ? `${dy} дн тому` : `${dy}d ago`;
}

export function isToday(d: string): boolean {
  return pd(d).toDateString() === new Date().toDateString();
}
