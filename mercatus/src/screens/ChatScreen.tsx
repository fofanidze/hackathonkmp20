import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { IcoName, Lang } from '../types/navigation';
import {
  sendMessage,
  getMessages,
  subscribeToMessages,
  Message,
  Resource,
  User,
} from '../../supabase';
import { uColor } from '../utils/user';
import { catIcon } from '../utils/categories';
import { ago } from '../utils/date';
import { Ico } from '../components/Ico';

type Props = {
  onBack: () => void;
  onGoToTrade: () => void;
  lang: Lang;
  user: User;
  resource: Resource;
};

export function ChatScreen({ onBack, onGoToTrade, lang, user, resource }: Props) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isOwn = resource.user_id === user.id;
  const otherName = isOwn
    ? resource.buyer_username ?? tr(lang, 'Buyer', 'Покупець')
    : resource.username;
  const oc = uColor(otherName);

  useEffect(() => {
    loadMsgs();
    const sub = subscribeToMessages(resource.id, (m: Message[]) => {
      setMsgs((prev) => {
        if (JSON.stringify(prev.map((x) => x.id)) !== JSON.stringify(m.map((x) => x.id))) {
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
          return m;
        }
        return prev;
      });
    });
    return () => sub.unsubscribe();
  }, [resource.id]);

  async function loadMsgs() {
    const m = await getMessages(resource.id);
    setMsgs(m);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
  }

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText('');
    const r = await sendMessage(resource.id, user.id, user.username, t);
    if (r.ok) {
      const m = await getMessages(resource.id);
      setMsgs(m);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } else {
      setText(t);
      Alert.alert(tr(lang, 'Error', 'Помилка'), r.error ?? 'Error');
    }
    setSending(false);
  }

  const tpls = lang === 'ua'
    ? ['Де зустрічаємось? 📍', 'Скільки маєте?', 'Коли зможете?', 'Домовились! ✅']
    : ['Where to meet? 📍', 'How much?', 'When free?', 'Deal! ✅'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={styles.chatHdr}>
        <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
          <Ico n="arrow-back" size={20} />
        </TouchableOpacity>
        <View style={[styles.avatarSm, { backgroundColor: oc + '22', borderColor: oc + '44' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: oc }}>
            {otherName.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{otherName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={catIcon(resource.have) as IcoName} size={12} color={colors.textSub} />
            <Text style={{ color: colors.textSub, fontSize: 12 }}>{resource.have}</Text>
            <Ico n="swap-horizontal-outline" size={12} color={colors.textLight} />
            <Ionicons name={catIcon(resource.need) as IcoName} size={12} color={colors.textSub} />
            <Text style={{ color: colors.textSub, fontSize: 12 }}>{resource.need}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.circleBtn} onPress={onGoToTrade}>
          <Ico n="clipboard-outline" size={18} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 44, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border }}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: 'center' }}
      >
        {tpls.map((t) => (
          <TouchableOpacity key={t} onPress={() => setText(t)} style={styles.qrChip}>
            <Text style={{ color: colors.textSub, fontSize: 12 }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 4 }}
          keyboardShouldPersistTaps="handled"
        >
          {msgs.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 48, gap: 10 }}>
              <Ico n="chatbubbles-outline" size={48} color={colors.textLight} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                {tr(lang, 'Start negotiating', 'Почніть переговори')}
              </Text>
              <Text
                style={{ color: colors.textSub, fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}
              >
                {tr(lang, 'Agree on location and details', 'Домовтесь про місце та деталі')}
              </Text>
            </View>
          )}
          {msgs.map((msg, i) => {
            const isMe = msg.sender_id === user.id;
            const mc = uColor(msg.sender_username);
            const prev = i > 0 ? msgs[i - 1] : null;
            const showAv = !prev || prev.sender_id !== msg.sender_id;
            const showTime =
              !prev ||
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 120000;
            return (
              <View key={msg.id}>
                {showTime && (
                  <Text style={{ color: colors.textLight, fontSize: 11, textAlign: 'center', marginVertical: 10 }}>
                    {ago(msg.created_at, lang === 'ua')}
                  </Text>
                )}
                <View
                  style={{
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: 8,
                    marginTop: showAv ? 8 : 2,
                  }}
                >
                  {showAv ? (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        backgroundColor: mc + '22',
                        borderWidth: 1,
                        borderColor: mc + '44',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '800', color: mc }}>
                        {msg.sender_username.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ width: 28, flexShrink: 0 }} />
                  )}
                  <View
                    style={{
                      maxWidth: '74%',
                      backgroundColor: isMe ? colors.green : colors.bg,
                      borderRadius: 18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: isMe ? colors.green : colors.border,
                    }}
                  >
                    {showAv && !isMe && (
                      <Text style={{ color: mc, fontSize: 11, fontWeight: '700', marginBottom: 3 }}>
                        {msg.sender_username}
                      </Text>
                    )}
                    <Text style={{ color: isMe ? colors.white : colors.text, fontSize: 15, lineHeight: 22 }}>
                      {msg.text}
                    </Text>
                    <Text
                      style={{
                        color: isMe ? 'rgba(255,255,255,0.6)' : colors.textLight,
                        fontSize: 10,
                        marginTop: 3,
                        alignSelf: 'flex-end',
                      }}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ height: 6 }} />
        </ScrollView>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatField}
            value={text}
            onChangeText={setText}
            placeholder={tr(lang, 'Message...', 'Написати...')}
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.green : colors.border }]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ico n="send-outline" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
