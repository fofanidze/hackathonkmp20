import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { URG } from '../constants/categories';
import { calcDistance, Resource, User } from '../../supabase';
import type { Lang } from '../types/navigation';
import { uColor } from '../utils/user';
import { ago } from '../utils/date';
import { tr } from '../i18n';
import { Ico } from './Ico';
import { TradePair } from './TradePair';

type Props = {
  r: Resource;
  user: User;
  myCoords: { lat: number; lng: number } | null;
  lang: Lang;
  onPress: () => void;
  onPressUser: () => void;
};

export function ResourceCard({ r, user, myCoords, lang, onPress, onPressUser }: Props) {
  const u = URG[r.urgency] ?? URG.medium;
  const isOwn = r.user_id === user.id;
  const dist =
    myCoords && r.lat && r.lng
      ? calcDistance(myCoords.lat, myCoords.lng, r.lat, r.lng)
      : null;
  const uc = uColor(r.username);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      {!!r.photo_url && (
        <Image
          source={{ uri: r.photo_url }}
          style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 14 }}
          resizeMode="cover"
        />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={[styles.avatarSm, { backgroundColor: uc + '22', borderColor: uc + '44' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: uc }}>
            {r.username.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={onPressUser} hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: isOwn ? colors.green : colors.text }}>
              {r.username}
              {isOwn ? (
                <Text style={{ color: colors.green, fontSize: 11 }}> (you)</Text>
              ) : null}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            {dist && (
              <>
                <Ico n="location-outline" size={12} color={colors.textSub} />
                <Text style={{ fontSize: 12, color: colors.textSub, marginRight: 4 }}>{dist}  · </Text>
              </>
            )}
            <Text style={{ fontSize: 12, color: colors.textSub }}>{ago(r.created_at, lang === 'ua')}</Text>
          </View>
        </View>
        <View style={[styles.urgBadge, { backgroundColor: u.bg }]}>
          <Text style={[styles.urgBadgeTxt, { color: u.color }]}>
            {tr(lang, u.label, u.labelUa)}
          </Text>
        </View>
      </View>
      <TradePair have={r.have} need={r.need} lang={lang} />
      {!!r.description && (
        <Text style={{ color: colors.textSub, fontSize: 13, marginTop: 12, lineHeight: 19 }} numberOfLines={2}>
          {r.description}
        </Text>
      )}
    </TouchableOpacity>
  );
}
