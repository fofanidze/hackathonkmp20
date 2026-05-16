import { colors } from '../theme/colors';
import type { Notif } from '../types/navigation';
import type { Resource, TradeHistory, User } from '../../supabase';
import { pd } from './date';

export function buildNotifs(
  history: TradeHistory[],
  resources: Resource[],
  user: User,
  ua: boolean,
): Notif[] {
  const n: Notif[] = [];
  const uniq = history.reduce((a: TradeHistory[], h) => {
    if (!a.find((x) => x.partner_username === h.partner_username && x.gave === h.gave)) {
      a.push(h);
    }
    return a;
  }, []);
  uniq.slice(0, 5).forEach((h) =>
    n.push({
      id: `t-${h.id}`,
      title: ua ? 'Обмін завершено' : 'Trade Complete',
      body: ua
        ? `${h.gave}↔${h.received} з ${h.partner_username}`
        : `${h.gave}↔${h.received} with ${h.partner_username}`,
      timeStr: h.created_at,
      read: pd(h.created_at).getTime() < Date.now() - 3600000,
      color: colors.green,
      icoName: 'checkmark-circle-outline',
    }),
  );
  resources
    .filter((r) => r.urgency === 'critical' && r.user_id !== user.id)
    .slice(0, 2)
    .forEach((r) =>
      n.push({
        id: `c-${r.id}`,
        title: ua ? 'Критичний запит' : 'Critical Nearby',
        body: ua ? `${r.username} потребує ${r.need}` : `${r.username} needs ${r.need}`,
        timeStr: r.created_at,
        read: false,
        color: colors.red,
        icoName: 'warning-outline',
      }),
    );
  const my = resources.filter((r) => r.user_id === user.id);
  resources
    .filter((r) => r.user_id !== user.id)
    .slice(0, 3)
    .forEach((r) => {
      if (my.find((m) => m.need === r.have || m.have === r.need)) {
        n.push({
          id: `m-${r.id}`,
          title: ua ? 'Знайдено збіг!' : 'Match Found!',
          body: ua ? `${r.username} має ${r.have}` : `${r.username} has ${r.have}`,
          timeStr: r.created_at,
          read: false,
          color: colors.blue,
          icoName: 'flash-outline',
        });
      }
    });
  return n.sort((a, b) => pd(b.timeStr).getTime() - pd(a.timeStr).getTime());
}
