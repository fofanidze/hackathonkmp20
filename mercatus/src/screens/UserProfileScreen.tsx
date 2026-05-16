import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { Lang } from '../types/navigation';
import { getUserById, getUserResources, getTradeHistory } from '../../supabase';
import { uColor } from '../utils/user';
import { Ico } from '../components/Ico';
import { TradePair } from '../components/TradePair';

type Props = {
  onBack: () => void;
  lang: Lang;
  userId: string;
  username: string;
};

export function UserProfileScreen({ onBack, lang, userId, username }: Props) {
  const [pu, setPu] = useState<Awaited<ReturnType<typeof getUserById>>>(null);
  const [res, setRes] = useState<Awaited<ReturnType<typeof getUserResources>>>([]);
  const [hist, setHist] = useState<Awaited<ReturnType<typeof getTradeHistory>>>([]);
  const [loading, setLoading] = useState(true);
  const uc = uColor(username);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [u, r, h] = await Promise.all([
        getUserById(userId),
        getUserResources(userId),
        getTradeHistory(userId),
      ]);
      setPu(u);
      setRes(r);
      setHist(h);
      setLoading(false);
    })();
  }, [userId]);

  const tc = hist.length;
  const lvl = tc === 0 ? 1 : tc < 5 ? 2 : tc < 15 ? 3 : 4;
  const lvlNamesEn = ['', 'Newcomer', 'Trader', 'Experienced', 'Master'];
  const lvlNamesUa = ['', 'Новачок', 'Трейдер', 'Досвідчений', 'Майстер'];
  const lvlName = tr(lang, lvlNamesEn[lvl], lvlNamesUa[lvl]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
          <Ico n="arrow-back" size={20} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.profileHero}>
            <View
              style={[
                styles.avatarLg,
                { backgroundColor: uc + '22', borderColor: uc + '55', overflow: 'hidden' },
              ]}
            >
              {pu?.avatar_url ? (
                <Image source={{ uri: pu.avatar_url }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ fontSize: 36, fontWeight: '800', color: uc }}>
                  {username.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{username}</Text>
            <View style={[styles.chip, { backgroundColor: uc + '22', borderColor: uc + '44' }]}>
              <Text style={{ color: uc, fontSize: 12, fontWeight: '600' }}>
                Lvl {lvl} · {lvlName}
              </Text>
            </View>
            {pu && (
              <Text style={{ color: colors.textLight, fontSize: 12 }}>
                {tr(lang, 'Member since', 'Учасник з')} {pu.created_at?.split('T')[0]}
              </Text>
            )}
          </View>
          <View style={styles.statsRow}>
            {[
              { lEn: 'Trades', lUa: 'Угод', v: String(tc), c: colors.green },
              { lEn: 'Rep', lUa: 'Репутація', v: String((pu?.reputation ?? 0) + tc * 5), c: uc },
              { lEn: 'Listings', lUa: 'Запитів', v: String(res.length), c: colors.blue },
            ].map((st, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: st.c }}>{st.v}</Text>
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                  {tr(lang, st.lEn, st.lUa)}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={[styles.secLbl, { marginBottom: 12 }]}>
              {tr(lang, 'Active listings', 'Активні пропозиції')} ({res.length})
            </Text>
            {res.length === 0 ? (
              <View style={[styles.sectionCard, { alignItems: 'center', paddingVertical: 28 }]}>
                <Text style={{ color: colors.textSub }}>
                  {tr(lang, 'No active listings', 'Немає активних запитів')}
                </Text>
              </View>
            ) : (
              res.map((r) => (
                <View key={r.id} style={[styles.sectionCard, { marginBottom: 12 }]}>
                  {!!r.photo_url && (
                    <Image
                      source={{ uri: r.photo_url }}
                      style={{ width: '100%', height: 130, borderRadius: 10, marginBottom: 12 }}
                      resizeMode="cover"
                    />
                  )}
                  <TradePair
                    have={r.have}
                    need={r.need}
                    lang={lang}
                    iconSize={20}
                    compact
                    offeringEn="HAS"
                    offeringUa="МАЄ"
                    lookingEn="WANTS"
                    lookingUa="ХОЧЕ"
                  />
                  {!!r.description && (
                    <Text style={{ color: colors.textSub, fontSize: 13, marginTop: 10 }} numberOfLines={2}>
                      {r.description}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
