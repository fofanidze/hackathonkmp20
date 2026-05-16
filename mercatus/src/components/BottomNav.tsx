import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { IcoName, Lang, Tab } from '../types/navigation';

type Props = {
  tab: Tab;
  setTab: (t: Tab) => void;
  unread: number;
  lang: Lang;
};

export function BottomNav({ tab, setTab, unread, lang }: Props) {
  const items: {
    name: IcoName;
    activeIcon: IcoName;
    labelEn: string;
    labelUa: string;
    tab: Tab;
    badge?: number;
  }[] = [
    { name: 'home-outline', activeIcon: 'home', labelEn: 'Home', labelUa: 'Головна', tab: 'Home' },
    { name: 'map-outline', activeIcon: 'map', labelEn: 'Map', labelUa: 'Карта', tab: 'Map' },
    { name: 'chatbubble-outline', activeIcon: 'chatbubble', labelEn: 'Chats', labelUa: 'Чати', tab: 'Chats' },
    {
      name: 'notifications-outline',
      activeIcon: 'notifications',
      labelEn: 'Alerts',
      labelUa: 'Сповіщ.',
      tab: 'Notifications',
      badge: unread,
    },
    { name: 'person-outline', activeIcon: 'person', labelEn: 'Profile', labelUa: 'Профіль', tab: 'Profile' },
  ];

  return (
    <View style={styles.nav}>
      {items.map((it) => {
        const active = tab === it.tab;
        return (
          <TouchableOpacity key={it.tab} style={styles.navItem} onPress={() => setTab(it.tab)}>
            <View style={[styles.navIconBox, active && styles.navIconBoxActive]}>
              <Ionicons
                name={active ? it.activeIcon : it.name}
                size={24}
                color={active ? colors.green : colors.textLight}
              />
              {(it.badge ?? 0) > 0 && (
                <View style={styles.navBadge}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{it.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.navLabel, { color: active ? colors.green : colors.textLight }]}>
              {tr(lang, it.labelEn, it.labelUa)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
