import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { CHAIN } from '../constants/categories';
import { tr } from '../i18n';
import type { IcoName, Lang } from '../types/navigation';
import { getTradeHistory, updateUser, User } from '../../supabase';
import { uColor } from '../utils/user';
import { catIcon } from '../utils/categories';
import { ago } from '../utils/date';
import { Ico } from '../components/Ico';
import { ReportModal } from '../components/modals/ReportModal';

type Props = {
  lang: Lang;
  setLang: (l: Lang) => void;
  user: User;
  onLogout: () => void;
  onUserUpdate: (u: User) => void;
};

export function ProfileScreen({ lang, setLang, user, onLogout, onUserUpdate }: Props) {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getTradeHistory>>>([]);
  const [loadH, setLoadH] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user.username);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarB64, setAvatarB64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [reportTgt, setReportTgt] = useState<{ username: string; userId: string } | null>(null);

  const uc = uColor(user.username);
  const curAvatar = avatarUri || user.avatar_url;

  useEffect(() => {
    getTradeHistory(user.id).then((h) => {
      setHistory(h);
      setLoadH(false);
    });
  }, []);

  async function pickAvatar() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });
    if (!r.canceled && r.assets[0]) {
      setAvatarUri(r.assets[0].uri);
      setAvatarB64(r.assets[0].base64 ?? null);
    }
  }

  async function save() {
    const t = newName.trim();
    if (t.length < 3) {
      setEditErr(tr(lang, 'Min 3 chars', 'Мінімум 3 символи'));
      return;
    }
    setSaving(true);
    setEditErr('');
    const upd: { username?: string; avatar_url?: string } = {};
    if (t !== user.username) upd.username = t;
    if (avatarB64) upd.avatar_url = `data:image/jpeg;base64,${avatarB64}`;
    if (!Object.keys(upd).length) {
      setEditing(false);
      setSaving(false);
      return;
    }
    const r = await updateUser(user.id, upd);
    setSaving(false);
    if (r.ok && r.user) {
      onUserUpdate(r.user);
      setEditing(false);
      setAvatarB64(null);
    } else setEditErr(r.error ?? 'Error');
  }

  function cancelEdit() {
    setEditing(false);
    setNewName(user.username);
    setAvatarUri(null);
    setAvatarB64(null);
    setEditErr('');
  }

  const tc = history.length;
  const lvl = tc === 0 ? 1 : tc < 5 ? 2 : tc < 15 ? 3 : 4;
  const lvlNamesEn = ['', 'Newcomer', 'Trader', 'Experienced', 'Master'];
  const lvlNamesUa = ['', 'Новачок', 'Трейдер', 'Досвідчений', 'Майстер'];
  const lvlName = tr(lang, lvlNamesEn[lvl], lvlNamesUa[lvl]);
  const nextAt = [0, 5, 15, 30, Infinity][lvl];
  const prog = nextAt === Infinity ? 1 : Math.min(tc / nextAt, 1);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.profileHero}>
        <TouchableOpacity onPress={editing ? pickAvatar : undefined} activeOpacity={editing ? 0.7 : 1}>
          <View
            style={[
              styles.avatarLg,
              { backgroundColor: uc + '22', borderColor: editing ? colors.green : uc + '55', overflow: 'hidden' },
            ]}
          >
            {curAvatar ? (
              <Image source={{ uri: curAvatar }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={{ fontSize: 36, fontWeight: '800', color: uc }}>
                {user.username.slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          {editing && (
            <View style={styles.avatarEditOverlay}>
              <Ico n="camera-outline" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        {editing ? (
          <View style={{ width: '100%', gap: 12, paddingHorizontal: 24 }}>
            <TextInput
              style={[styles.field, { textAlign: 'center', fontSize: 17, fontWeight: '600' }]}
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="none"
              maxLength={20}
            />
            {editErr ? (
              <Text style={{ color: colors.red, fontSize: 13, textAlign: 'center' }}>{editErr}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.btnOut, { flex: 1, paddingVertical: 12 }]} onPress={cancelEdit}>
                <Text style={[styles.btnOutTxt, { fontSize: 14 }]}>{tr(lang, 'Cancel', 'Скасувати')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, paddingVertical: 12 }]} onPress={save} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.btnTxt, { fontSize: 14 }]}>{tr(lang, 'Save', 'Зберегти')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{user.username}</Text>
            <View style={[styles.chip, { backgroundColor: uc + '22', borderColor: uc + '44' }]}>
              <Text style={{ color: uc, fontSize: 12, fontWeight: '600' }}>
                Lvl {lvl} · {lvlName}
              </Text>
            </View>
            <Text style={{ color: colors.textLight, fontSize: 12 }}>
              {tr(lang, 'Member since', 'Учасник з')} {user.created_at?.split('T')[0]}
            </Text>
            <TouchableOpacity
              style={[styles.chip, { marginTop: 4, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
              onPress={() => setEditing(true)}
            >
              <Ico n="pencil-outline" size={13} color={colors.textSub} />
              <Text style={{ color: colors.textSub, fontSize: 12 }}>
                {tr(lang, 'Edit profile', 'Редагувати профіль')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        {[
          { lEn: 'Trades', lUa: 'Угод', v: String(tc), c: colors.green },
          { lEn: 'Level', lUa: 'Рівень', v: String(lvl), c: uc },
          { lEn: 'Reputation', lUa: 'Репутація', v: String(user.reputation + tc * 5), c: colors.blue },
        ].map((st, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: st.c }}>{st.v}</Text>
            <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
              {tr(lang, st.lEn, st.lUa)}
            </Text>
          </View>
        ))}
      </View>

      {nextAt !== Infinity && (
        <View style={[styles.sectionCard, { marginHorizontal: 16, marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: colors.textSub, fontSize: 13 }}>
              {tr(lang, 'Progress to level', 'Прогрес до рівня')} {lvl + 1}
            </Text>
            <Text style={{ color: uc, fontSize: 13, fontWeight: '600' }}>
              {tc} / {nextAt}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
            <View
              style={{
                height: 6,
                backgroundColor: uc,
                borderRadius: 3,
                width: `${Math.round(prog * 100)}%` as any,
              }}
            />
          </View>
        </View>
      )}

      <View style={[styles.sectionCard, { marginHorizontal: 16, marginBottom: 12 }]}>
        <Text style={[styles.secLbl, { marginBottom: 12 }]}>{tr(lang, 'Language', 'Мова')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.langChip, { flex: 1, justifyContent: 'center' }, lang === 'en' && styles.langChipA]}
            onPress={() => setLang('en')}
          >
            <Text style={[styles.langChipTxt, { textAlign: 'center' }, lang === 'en' && { color: colors.white }]}>
              🇬🇧 English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langChip, { flex: 1, justifyContent: 'center' }, lang === 'ua' && styles.langChipA]}
            onPress={() => setLang('ua')}
          >
            <Text style={[styles.langChipTxt, { textAlign: 'center' }, lang === 'ua' && { color: colors.white }]}>
              🇺🇦 Українська
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={[styles.secLbl, { marginBottom: 12 }]}>{tr(lang, 'Trade history', 'Історія угод')}</Text>
        {loadH ? (
          <ActivityIndicator color={colors.green} />
        ) : history.length === 0 ? (
          <View style={[styles.sectionCard, { alignItems: 'center', paddingVertical: 32 }]}>
            <Ico n="mail-open-outline" size={44} color={colors.textLight} />
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 10 }}>
              {tr(lang, 'No trades yet', 'Угод ще немає')}
            </Text>
          </View>
        ) : (
          history.map((h, i) => (
            <View key={h.id} style={[styles.sectionCard, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: CHAIN[i % 4] + '22',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={catIcon(h.gave) as IcoName} size={22} color={CHAIN[i % 4]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                    {h.gave} → {h.received}
                  </Text>
                  <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                    {tr(lang, 'with', 'з')} {h.partner_username} · {ago(h.created_at, lang === 'ua')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: colors.greenLight,
                        borderColor: '#C8E6C9',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                      },
                    ]}
                  >
                    <Ico n="checkmark" size={12} color={colors.green} />
                    <Text style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>+5</Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: colors.redLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => setReportTgt({ username: h.partner_username, userId: h.user_id })}
                  >
                    <Ico n="warning-outline" size={16} color={colors.red} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {reportTgt && (
        <ReportModal
          visible={!!reportTgt}
          onClose={() => setReportTgt(null)}
          lang={lang}
          reporter={user}
          reportedUsername={reportTgt.username}
          reportedUserId={reportTgt.userId}
        />
      )}

      <TouchableOpacity
        style={[
          styles.btnOut,
          {
            marginHorizontal: 16,
            marginTop: 20,
            borderColor: colors.red,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          },
        ]}
        onPress={onLogout}
      >
        <Ico n="log-out-outline" size={18} color={colors.red} />
        <Text style={[styles.btnOutTxt, { color: colors.red }]}>
          {tr(lang, 'Log out', 'Вийти з акаунту')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
