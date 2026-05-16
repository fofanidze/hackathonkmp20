import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { URG } from '../constants/categories';
import { tr } from '../i18n';
import type { IcoName, Lang } from '../types/navigation';
import { getUserChats, Message, Resource, User } from '../../supabase';
import { uColor } from '../utils/user';
import { catIcon } from '../utils/categories';
import { ago } from '../utils/date';
import { Ico } from '../components/Ico';

type ChatResource = Resource & { last_message: Message };

type Props = {
  lang: Lang;
  user: User;
  onOpenChat: (r: Resource) => void;
};

export function ChatsListScreen({ lang, user, onOpenChat }: Props) {
  const [chats, setChats] = useState<ChatResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  async function load() {
    const d = await getUserChats(user.id);
    setChats(d as ChatResource[]);
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.screenHdr}>
        <Text style={styles.screenTitle}>{tr(lang, 'Chats', 'Чати')}</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      ) : chats.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 }}>
          <Ico n="chatbubbles-outline" size={56} color={colors.textLight} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
            {tr(lang, 'No chats yet', 'Чатів ще немає')}
          </Text>
          <Text style={{ color: colors.textSub, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
            {tr(lang, 'Open any trade and send a message', 'Відкрийте трейд і напишіть повідомлення')}
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {chats.map((chat) => {
            const isOwn = chat.user_id === user.id;
            const otherName = isOwn
              ? chat.buyer_username ?? tr(lang, 'Awaiting buyer', 'Очікую покупця')
              : chat.username;
            const oc = uColor(otherName);
            const u = URG[chat.urgency] ?? URG.medium;
            return (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatRow}
                onPress={() => onOpenChat(chat)}
                activeOpacity={0.85}
              >
                <View style={[styles.avatarMd, { backgroundColor: oc + '22', borderColor: oc + '44' }]}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: oc }}>
                    {otherName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {otherName}
                    </Text>
                    <Text style={{ color: colors.textLight, fontSize: 11 }}>
                      {ago(chat.last_message.created_at, lang === 'ua')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={catIcon(chat.have) as IcoName} size={13} color={colors.textSub} />
                    <Text style={{ color: colors.textSub, fontSize: 12 }}>{chat.have}</Text>
                    <Ico n="swap-horizontal-outline" size={13} color={colors.textLight} />
                    <Ionicons name={catIcon(chat.need) as IcoName} size={13} color={colors.textSub} />
                    <Text style={{ color: colors.textSub, fontSize: 12 }}>{chat.need}</Text>
                  </View>
                  <Text
                    style={{
                      color: chat.last_message.sender_id === user.id ? colors.green : colors.textSub,
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {chat.last_message.sender_id === user.id
                      ? tr(lang, 'You: ', 'Ви: ')
                      : `${chat.last_message.sender_username}: `}
                    {chat.last_message.text}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: chat.active ? colors.green : '#CCC',
                    }}
                  />
                  <View style={[styles.urgBadge, { backgroundColor: u.bg }]}>
                    <Text style={[styles.urgBadgeTxt, { color: u.color, fontSize: 9 }]}>
                      {tr(lang, u.label, u.labelUa)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
