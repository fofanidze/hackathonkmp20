import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { Lang, Notif } from '../types/navigation';
import { getTradeHistory, getAllResources, User } from '../../supabase';
import { buildNotifs } from '../utils/notifications';
import { ago, isToday } from '../utils/date';
import { Ico } from '../components/Ico';

type Props = {
  lang: Lang;
  user: User;
};

export function NotificationsScreen({ lang, user }: Props) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [ra, setRa] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [h, r] = await Promise.all([getTradeHistory(user.id), getAllResources()]);
      setNotifs(buildNotifs(h, r, user, lang === 'ua'));
      setLoading(false);
    })();
  }, []);

  const disp = ra ? notifs.map((n) => ({ ...n, read: true })) : notifs;
  const unread = disp.filter((n) => !n.read).length;
  const todayN = disp.filter((n) => isToday(n.timeStr));
  const oldN = disp.filter((n) => !isToday(n.timeStr));

  function rn(n: Notif) {
    return (
      <View
        key={n.id}
        style={[styles.notifCard, !n.read && { borderLeftWidth: 3, borderLeftColor: n.color }]}
      >
        <View style={[styles.notifIconBox, { backgroundColor: n.color + '22' }]}>
          <Ionicons name={n.icoName} size={22} color={n.color} />
          {!n.read && <View style={[styles.unreadDot, { backgroundColor: n.color }]} />}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 14, fontWeight: n.read ? '500' : '700', color: colors.text }}>
            {n.title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSub, lineHeight: 18 }} numberOfLines={2}>
            {n.body}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textLight }}>{ago(n.timeStr, lang === 'ua')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.screenHdr}>
        <Text style={styles.screenTitle}>{tr(lang, 'Notifications', 'Сповіщення')}</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={() => setRa(true)}>
            <Text style={{ color: colors.green, fontSize: 13, fontWeight: '600' }}>
              {tr(lang, 'Mark all read', 'Прочитати всі')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      ) : notifs.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ico n="notifications-outline" size={52} color={colors.textLight} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
            {tr(lang, 'All quiet', 'Поки тихо')}
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 4 }}>
          {unread > 0 && (
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View style={[styles.chip, { backgroundColor: colors.green + '22', borderColor: colors.green + '44' }]}>
                <Text style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>
                  {unread} {tr(lang, 'new', 'нових')}
                </Text>
              </View>
            </View>
          )}
          {todayN.length > 0 && (
            <>
              <Text style={styles.notifSec}>{tr(lang, 'TODAY', 'СЬОГОДНІ')}</Text>
              {todayN.map(rn)}
            </>
          )}
          {oldN.length > 0 && (
            <>
              <Text style={[styles.notifSec, { marginTop: 16 }]}>{tr(lang, 'EARLIER', 'РАНІШЕ')}</Text>
              {oldN.map(rn)}
            </>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
