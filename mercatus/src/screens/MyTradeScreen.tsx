import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { IcoName, Lang } from '../types/navigation';
import { deleteResource, subscribeToResource, Resource, User } from '../../supabase';
import { catIcon } from '../utils/categories';
import { Ico } from '../components/Ico';
import { CancelTradeModal } from '../components/modals/CancelTradeModal';

type Props = {
  onBack: () => void;
  lang: Lang;
  user: User;
  resource: Resource | null;
};

export function MyTradeScreen({ onBack, lang, user, resource }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [buyerUsername, setBuyerUsername] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // MERCATUS-{sellerId8}-{resourceId8}
  const tradeId = `MERCATUS-${user.id.slice(0, 8)}-${resource?.id?.slice(0, 8) ?? 'trade'}`;

  useEffect(() => {
    if (!resource?.id || confirmed) return;
    const sub = subscribeToResource(resource.id, (r) => {
      if (r && !r.active && r.buyer_username) {
        setBuyerUsername(r.buyer_username);
        setConfirmed(true);
      }
    });
    return () => sub.unsubscribe();
  }, [resource?.id]);

  async function handleDelete() {
    Alert.alert(
      tr(lang, 'Delete listing?', 'Видалити заявку?'),
      tr(lang, 'This listing will no longer be visible.', 'Заявка більше не буде видна.'),
      [
        { text: tr(lang, 'No', 'Ні'), style: 'cancel' },
        {
          text: tr(lang, 'Yes, delete', 'Так, видалити'),
          style: 'destructive',
          onPress: async () => {
            if (!resource) return;
            setDeleting(true);
            await deleteResource(resource.id);
            setDeleting(false);
            onBack();
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
          <Ico n="arrow-back" size={20} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.screenTitle}>{tr(lang, 'My Listing', 'Мій запит')}</Text>
          <Text style={{ color: colors.textSub, fontSize: 13 }}>
            {confirmed
              ? tr(lang, 'Complete', 'Завершено')
              : cancelled
                ? tr(lang, 'Cancelled', 'Скасовано')
                : tr(lang, 'Waiting for buyer', 'Очікую покупця')}
          </Text>
        </View>
      </View>
      {resource && (
        <CancelTradeModal
          visible={showCancel}
          onClose={() => setShowCancel(false)}
          onConfirmed={() => {
            setShowCancel(false);
            setCancelled(true);
          }}
          lang={lang}
          user={user}
          resource={resource}
          otherUserId={resource.buyer_id ?? ''}
        />
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
        {!!resource?.photo_url && (
          <Image
            source={{ uri: resource.photo_url }}
            style={{ width: '100%', height: 180, borderRadius: 16 }}
            resizeMode="cover"
          />
        )}
        <View style={styles.sectionCard}>
          <Text style={[styles.secLbl, { marginBottom: 14 }]}>{tr(lang, 'My Exchange', 'Мій обмін')}</Text>
          {!confirmed && !cancelled && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.redLight,
                borderWidth: 1,
                borderColor: colors.red + '55',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.red} />
              ) : (
                <Ico n="close" size={16} color={colors.red} />
              )}
            </TouchableOpacity>
          )}
          <View style={styles.tradeRow}>
            <View
              style={[
                styles.tradeBox,
                { backgroundColor: colors.greenLight, borderColor: '#C8E6C9', alignItems: 'center' },
              ]}
            >
              <Ionicons name={catIcon(resource?.have ?? '') as IcoName} size={32} color={colors.green} />
              <Text style={{ fontSize: 10, color: colors.green, fontWeight: '700', marginTop: 6 }}>
                {tr(lang, 'OFFERING', 'ПРОПОНУЮ')}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 }}>
                {resource?.have}
              </Text>
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
              <Ico n="swap-horizontal-outline" size={22} color={colors.textLight} />
            </View>
            <View
              style={[
                styles.tradeBox,
                { backgroundColor: colors.blueLight, borderColor: '#BBDEFB', alignItems: 'center' },
              ]}
            >
              <Ionicons name={catIcon(resource?.need ?? '') as IcoName} size={32} color={colors.blue} />
              <Text style={{ fontSize: 10, color: colors.blue, fontWeight: '700', marginTop: 6 }}>
                {tr(lang, 'LOOKING FOR', 'ШУКАЮ')}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 }}>
                {resource?.need}
              </Text>
            </View>
          </View>
          {!!resource?.description && (
            <Text style={{ color: colors.textSub, fontSize: 13, marginTop: 14, lineHeight: 19 }}>
              {resource.description}
            </Text>
          )}
        </View>
        {!confirmed && !cancelled && (
          <View style={[styles.sectionCard, { alignItems: 'center', gap: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }} />
              <Text style={{ color: colors.green, fontSize: 13, fontWeight: '500' }}>
                {tr(lang, 'Waiting for buyer to scan...', 'Очікую сканування QR...')}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
              {tr(lang, 'Your QR Code', 'Ваш QR код')}
            </Text>
            <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center' }}>
              {tr(lang, 'Show this to the buyer to scan', 'Покажіть покупцю для сканування')}
            </Text>
            <View
              style={{
                backgroundColor: colors.white,
                padding: 20,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <QRCode value={tradeId} size={180} color="#1A1A1A" backgroundColor="#FFFFFF" />
            </View>
          </View>
        )}
        {confirmed && (
          <View style={styles.successBanner}>
            <Ico n="checkmark-circle-outline" size={32} color={colors.white} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white }}>
                {tr(lang, 'Trade Complete!', 'Обмін завершено!')}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                {tr(lang, `Buyer: ${buyerUsername}`, `Покупець: ${buyerUsername}`)}
              </Text>
            </View>
          </View>
        )}
        {cancelled && (
          <View
            style={[
              styles.sectionCard,
              { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.red + '44', borderWidth: 1 },
            ]}
          >
            <Ico n="ban-outline" size={28} color={colors.red} />
            <Text style={{ color: colors.red, fontSize: 15, fontWeight: '600', flex: 1 }}>
              {tr(lang, 'Deal cancelled', 'Угоду скасовано')}
            </Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      <View style={styles.footer}>
        {cancelled || confirmed ? (
          <TouchableOpacity style={styles.btn} onPress={onBack}>
            <Text style={styles.btnTxt}>{tr(lang, 'Go Home', 'На головну')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.btnOut,
              { borderColor: colors.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
            ]}
            onPress={() => setShowCancel(true)}
          >
            <Ico n="ban-outline" size={16} color={colors.red} />
            <Text style={[styles.btnOutTxt, { color: colors.red }]}>
              {tr(lang, 'Deal fell through — cancel', 'Угода зірвана — скасувати')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
