import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { lightMap } from '../constants/mapStyle';
import { URG } from '../constants/categories';
import { tr } from '../i18n';
import type { IcoName, Lang, Screen } from '../types/navigation';
import {
  calcDistance,
  getAllResources,
  subscribeToResources,
  Resource,
  User,
} from '../../supabase';
import { uColor } from '../utils/user';
import { catIcon } from '../utils/categories';
import { Ico } from '../components/Ico';
import { TradePair } from '../components/TradePair';

type Props = {
  onNavigate: (s: Screen) => void;
  lang: Lang;
  user: User;
  onSelectResource: (r: Resource) => void;
  onSelectUser: (uid: string, un: string) => void;
};

export function MapScreen({ onNavigate, lang, user, onSelectResource, onSelectUser }: Props) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    getLoc();
    getAllResources().then((r) => {
      setResources(r);
      setLoading(false);
    });
    const ch = subscribeToResources((r) => setResources(r));
    return () => ch.unsubscribe();
  }, []);

  async function getLoc() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: l.coords.latitude, lng: l.coords.longitude });
    } catch {}
  }

  if (loading || !coords) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  const wc = resources.filter((r) => r.lat && r.lng);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        customMapStyle={lightMap}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Circle
          center={{ latitude: coords.lat, longitude: coords.lng }}
          radius={2500}
          strokeColor={colors.green + '44'}
          fillColor={colors.green + '11'}
          strokeWidth={1.5}
        />
        {wc.map((r) => {
          const isOwn = r.user_id === user.id;
          const u = URG[r.urgency] ?? URG.medium;
          return (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.lat!, longitude: r.lng! }}
              onPress={() => setSelected(r)}
            >
              <View style={[styles.mapPin, { backgroundColor: isOwn ? colors.green : u.color }]}>
                <Ionicons name={catIcon(r.have) as IcoName} size={16} color="#fff" />
              </View>
            </Marker>
          );
        })}
      </MapView>
      <View style={styles.mapHdr}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
            {tr(lang, 'Resource Map', 'Карта ресурсів')}
          </Text>
          <Text style={{ color: colors.textSub, fontSize: 12 }}>
            {wc.length} {tr(lang, 'on map', 'на карті')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.mapCircleBtn}
          onPress={() =>
            mapRef.current?.animateToRegion(
              { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
              500,
            )
          }
        >
          <Ico n="locate-outline" size={20} color={colors.green} />
        </TouchableOpacity>
      </View>
      <View style={styles.mapLegend}>
        {[
          { c: '#2E7D32', lEn: 'Low', lUa: 'Низька' },
          { c: '#E65100', lEn: 'Medium', lUa: 'Середня' },
          { c: '#C62828', lEn: 'Critical', lUa: 'Критична' },
          { c: colors.green, lEn: 'Mine', lUa: 'Мій' },
        ].map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.c }} />
            <Text style={{ color: colors.textSub, fontSize: 11 }}>{tr(lang, it.lEn, it.lUa)}</Text>
          </View>
        ))}
      </View>
      {selected && (
        <View style={styles.mapPopup}>
          <TouchableOpacity style={styles.mapPopupClose} onPress={() => setSelected(null)}>
            <Ico n="close" size={20} color={colors.textSub} />
          </TouchableOpacity>
          {!!selected.photo_url && (
            <Image
              source={{ uri: selected.photo_url }}
              style={{ width: '100%', height: 110, borderRadius: 12, marginBottom: 12 }}
              resizeMode="cover"
            />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <View style={[styles.avatarSm, { backgroundColor: uColor(selected.username) + '22' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: uColor(selected.username) }}>
                {selected.username.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => {
                  if (selected.user_id !== user.id) {
                    setSelected(null);
                    onSelectUser(selected.user_id, selected.username);
                  }
                }}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{selected.username}</Text>
              </TouchableOpacity>
              {coords && selected.lat && selected.lng && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ico n="location-outline" size={12} color={colors.green} />
                  <Text style={{ color: colors.green, fontSize: 12 }}>
                    {calcDistance(coords.lat, coords.lng, selected.lat, selected.lng)}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.urgBadge,
                { backgroundColor: (URG[selected.urgency] ?? URG.medium).bg },
              ]}
            >
              <Text
                style={[
                  styles.urgBadgeTxt,
                  { color: (URG[selected.urgency] ?? URG.medium).color },
                ]}
              >
                {tr(
                  lang,
                  (URG[selected.urgency] ?? URG.medium).label,
                  (URG[selected.urgency] ?? URG.medium).labelUa,
                )}
              </Text>
            </View>
          </View>
          <TradePair have={selected.have} need={selected.need} lang={lang} iconSize={20} compact />
          <TouchableOpacity
            style={[styles.btn, { marginTop: 14 }]}
            onPress={() => {
              onSelectResource(selected);
              setSelected(null);
              onNavigate(selected.user_id === user.id ? 'MyTrade' : 'ActiveTrade');
            }}
          >
            <Text style={styles.btnTxt}>
              {selected.user_id === user.id
                ? tr(lang, 'View', 'Переглянути')
                : tr(lang, 'Trade', 'Обмінятись')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
