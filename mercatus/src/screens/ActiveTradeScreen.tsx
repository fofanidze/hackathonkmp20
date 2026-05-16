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
import * as Location from 'expo-location';
import { useCameraPermissions } from 'expo-camera';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { IcoName, Lang } from '../types/navigation';
import { calcDistance, completeTrade, Resource, User } from '../../supabase';
import { uColor } from '../utils/user';
import { catIcon } from '../utils/categories';
import { Ico } from '../components/Ico';
import { CancelTradeModal } from '../components/modals/CancelTradeModal';
import { ReportModal } from '../components/modals/ReportModal';
import { QRScannerScreen } from './QRScannerScreen';

type Props = {
  onBack: () => void;
  lang: Lang;
  user: User;
  resource: Resource | null;
  onViewProfile: (uid: string, un: string) => void;
  onOpenChat: () => void;
};

export function ActiveTradeScreen({
  onBack,
  lang,
  user,
  resource,
  onViewProfile,
  onOpenChat,
}: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const dist =
    coords && resource?.lat && resource?.lng
      ? calcDistance(coords.lat, coords.lng, resource.lat, resource.lng)
      : null;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: l.coords.latitude, lng: l.coords.longitude });
      } catch {}
    })();
  }, []);

  async function scan() {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert(tr(lang, 'Permission needed', 'Потрібен дозвіл'));
        return;
      }
    }
    setShowScanner(true);
  }

  async function handleScanned(data: string) {
    setShowScanner(false);
    if (!data.startsWith('MERCATUS-')) {
      Alert.alert(tr(lang, 'Invalid QR', 'Невірний QR'));
      return;
    }
    if (!resource) return;
    setLoading(true);
    const ok = await completeTrade(resource, user.id, user.username);
    setLoading(false);
    if (ok) setConfirmed(true);
    else Alert.alert(tr(lang, 'Error', 'Помилка'), tr(lang, 'Try again', 'Спробуйте ще раз'));
  }

  if (showScanner) {
    return <QRScannerScreen onScanned={handleScanned} onCancel={() => setShowScanner(false)} lang={lang} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
          <Ico n="arrow-back" size={20} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.screenTitle}>{tr(lang, 'Trade', 'Угода')}</Text>
          <Text style={{ color: colors.textSub, fontSize: 13 }}>
            {confirmed
              ? tr(lang, 'Done', 'Завершено')
              : cancelled
                ? tr(lang, 'Cancelled', 'Скасовано')
                : tr(lang, 'In progress', 'В процесі')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.circleBtn, { borderColor: colors.green + '44', marginRight: 8 }]}
          onPress={onOpenChat}
        >
          <Ico n="chatbubble-outline" size={18} color={colors.green} />
        </TouchableOpacity>
        {resource && (
          <TouchableOpacity
            style={[styles.circleBtn, { borderColor: colors.blue + '44' }]}
            onPress={() => onViewProfile(resource.user_id, resource.username)}
          >
            <Ico n="person-outline" size={18} color={colors.blue} />
          </TouchableOpacity>
        )}
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
          otherUserId={resource.user_id}
        />
      )}
      {resource && (
        <ReportModal
          visible={showReport}
          onClose={() => setShowReport(false)}
          lang={lang}
          reporter={user}
          reportedUsername={resource.username}
          reportedUserId={resource.user_id}
          resourceId={resource.id}
        />
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View
                style={[
                  styles.avatarMd,
                  { backgroundColor: uColor(user.username) + '22', borderColor: uColor(user.username) + '55' },
                ]}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: uColor(user.username) }}>
                  {user.username.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                {tr(lang, 'You', 'Ви')}
              </Text>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name={catIcon(resource?.need ?? '') as IcoName} size={20} color={colors.textSub} />
                <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>{resource?.need}</Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 12 }}>
              <Ico n="swap-horizontal-outline" size={24} color={colors.textLight} />
            </View>
            <TouchableOpacity
              style={{ flex: 1, alignItems: 'center', gap: 8 }}
              onPress={() => resource && onViewProfile(resource.user_id, resource.username)}
            >
              <View
                style={[
                  styles.avatarMd,
                  {
                    backgroundColor: uColor(resource?.username ?? '') + '22',
                    borderColor: uColor(resource?.username ?? '') + '55',
                  },
                ]}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: uColor(resource?.username ?? '') }}>
                  {(resource?.username ?? '??').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                {resource?.username}
              </Text>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name={catIcon(resource?.have ?? '') as IcoName} size={20} color={colors.textSub} />
                <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>{resource?.have}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        {!!resource?.photo_url && (
          <View style={styles.sectionCard}>
            <Text style={[styles.secLbl, { marginBottom: 10 }]}>{tr(lang, 'Item Photo', 'Фото товару')}</Text>
            <Image
              source={{ uri: resource.photo_url }}
              style={{ width: '100%', height: 200, borderRadius: 12 }}
              resizeMode="cover"
            />
          </View>
        )}
        {!!resource?.description && (
          <View style={styles.sectionCard}>
            <Text style={[styles.secLbl, { marginBottom: 6 }]}>{tr(lang, 'Description', 'Опис')}</Text>
            <Text style={{ color: colors.textSub, fontSize: 14, lineHeight: 20 }}>{resource.description}</Text>
          </View>
        )}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.greenLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ico n="location-outline" size={22} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                {tr(lang, 'Seller location', 'Локація продавця')}
              </Text>
              <Text style={{ color: colors.textSub, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                {resource?.address ?? tr(lang, 'Not specified', 'Не вказано')}
              </Text>
              {dist && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ico n="walk-outline" size={16} color={colors.green} />
                  <Text style={{ color: colors.green, fontSize: 14, fontWeight: '700' }}>
                    {dist} {tr(lang, 'away', 'від вас')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {confirmed && (
          <View style={{ gap: 10 }}>
            <View style={styles.successBanner}>
              <Ico n="checkmark-circle-outline" size={32} color={colors.white} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>
                  {tr(lang, 'Trade Confirmed!', 'Обмін підтверджено!')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.red + '44',
                backgroundColor: colors.redLight,
              }}
              onPress={() => setShowReport(true)}
            >
              <Ico n="warning-outline" size={14} color={colors.red} />
              <Text style={{ color: colors.red, fontSize: 13, fontWeight: '600' }}>
                {tr(lang, 'Something wrong? Report', 'Щось пішло не так? Поскаржитись')}
              </Text>
            </TouchableOpacity>
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
              {(tr(lang, 'Deal cancelled', 'Угоду скасовано'))}
            </Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      <View style={styles.footer}>
        {cancelled ? (
          <TouchableOpacity style={styles.btn} onPress={onBack}>
            <Text style={styles.btnTxt}>{tr(lang, 'Go Home', 'На головну')}</Text>
          </TouchableOpacity>
        ) : confirmed ? (
          <TouchableOpacity style={styles.btn} onPress={onBack}>
            <Text style={styles.btnTxt}>{tr(lang, 'Go Home', 'На головну')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
              onPress={scan}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ico n="qr-code-outline" size={20} color={colors.white} />
                  <Text style={styles.btnTxt}>{tr(lang, 'Scan Seller QR', 'Сканувати QR продавця')}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              onPress={() => setShowCancel(true)}
            >
              <Ico n="ban-outline" size={14} color={colors.red} />
              <Text style={{ color: colors.red, fontSize: 13, fontWeight: '500' }}>
                {tr(lang, 'Deal fell through — cancel', 'Угода зірвана — скасувати')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
