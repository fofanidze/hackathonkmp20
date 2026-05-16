import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '../theme/colors';
import type { Lang, Screen, Tab } from '../types/navigation';
import { getAllResources, subscribeToResources, Resource, User } from '../../supabase';
import { BottomNav } from '../components/BottomNav';
import { HomeScreen } from './HomeScreen';
import { MapScreen } from './MapScreen';
import { ChatsListScreen } from './ChatsListScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { ProfileScreen } from './ProfileScreen';

type Props = {
  lang: Lang;
  setLang: (l: Lang) => void;
  user: User;
  onLogout: () => void;
  onNavigate: (s: Screen) => void;
  onSelectResource: (r: Resource) => void;
  onSelectUser: (uid: string, un: string) => void;
  onUserUpdate: (u: User) => void;
};

export function MainTabs({
  lang,
  setLang,
  user,
  onLogout,
  onNavigate,
  onSelectResource,
  onSelectUser,
  onUserUpdate,
}: Props) {
  const [tab, setTab] = useState<Tab>('Home');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const ch = subscribeToResources((r) =>
      setUnread(r.filter((x) => x.urgency === 'critical' && x.user_id !== user.id).length),
    );
    getAllResources().then((r) =>
      setUnread(r.filter((x) => x.urgency === 'critical' && x.user_id !== user.id).length),
    );
    return () => ch.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        {tab === 'Home' && (
          <HomeScreen
            onNavigate={onNavigate}
            lang={lang}
            user={user}
            onSelectResource={onSelectResource}
            onSelectUser={onSelectUser}
            onSwitchToMap={() => setTab('Map')}
          />
        )}
        {tab === 'Map' && (
          <MapScreen
            onNavigate={onNavigate}
            lang={lang}
            user={user}
            onSelectResource={onSelectResource}
            onSelectUser={onSelectUser}
          />
        )}
        {tab === 'Chats' && (
          <ChatsListScreen
            lang={lang}
            user={user}
            onOpenChat={(r) => {
              onSelectResource(r);
              onNavigate('Chat');
            }}
          />
        )}
        {tab === 'Notifications' && <NotificationsScreen lang={lang} user={user} />}
        {tab === 'Profile' && (
          <ProfileScreen
            lang={lang}
            setLang={setLang}
            user={user}
            onLogout={onLogout}
            onUserUpdate={onUserUpdate}
          />
        )}
      </View>
      <BottomNav tab={tab} setTab={setTab} unread={unread} lang={lang} />
    </View>
  );
}
