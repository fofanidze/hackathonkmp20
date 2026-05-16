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
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { RES_EN, RES_UA, URG } from '../constants/categories';
import { tr } from '../i18n';
import type { IcoName, Lang, Screen } from '../types/navigation';
import { getAllResources, subscribeToResources, Resource, User } from '../../supabase';
import { uColor } from '../utils/user';
import { catIcon } from '../utils/categories';
import { Ico } from '../components/Ico';
import { ResourceCard } from '../components/ResourceCard';

type Props = {
  onNavigate: (s: Screen) => void;
  lang: Lang;
  user: User;
  onSelectResource: (r: Resource) => void;
  onSelectUser: (uid: string, un: string) => void;
  onSwitchToMap: () => void;
};

export function HomeScreen({
  onNavigate,
  lang,
  user,
  onSelectResource,
  onSelectUser,
  onSwitchToMap,
}: Props) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [search, setSearch] = useState('');
  const [fu, setFu] = useState('');
  const [fc, setFc] = useState('');
  const [showF, setShowF] = useState(false);
  const uc = uColor(user.username);

  useEffect(() => {
    load();
    getLoc();
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

  async function load() {
    setLoading(true);
    setResources(await getAllResources());
    setLoading(false);
  }

  const filtered = resources.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        r.have.toLowerCase().includes(q) ||
        r.need.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)) &&
      (!fu || r.urgency === fu) &&
      (!fc || r.have === fc || r.need === fc)
    );
  });
  const af = [fu, fc].filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.homeHdr}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {tr(lang, `Hi, ${user.username}!`, `Привіт, ${user.username}!`)}
          </Text>
          <Text style={styles.greetingSub}>
            {resources.length} {tr(lang, 'listings near you', 'активних запитів')}
          </Text>
        </View>
        <View
          style={[
            styles.avatarMd,
            { backgroundColor: uc + '22', borderColor: uc + '44', overflow: 'hidden' },
          ]}
        >
          {user.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={{ width: '100%', height: '100%', borderRadius: 23 }}
            />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: uc }}>
              {user.username.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.mapTeaser} onPress={onSwitchToMap} activeOpacity={0.9}>
        <View style={styles.mapTeaserIcon}>
          <Ico n="map-outline" size={22} color={colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
            {tr(lang, 'Browse on map', 'Переглянути на карті')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSub }}>
            {tr(lang, 'Find listings near you', 'Знайди запити поруч')}
          </Text>
        </View>
        <Ico n="chevron-forward" size={18} color={colors.green} />
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
        <View style={styles.searchBar}>
          <Ico n="search-outline" size={18} color={colors.textLight} />
          <TextInput
            style={{ flex: 1, color: colors.text, fontSize: 14 }}
            value={search}
            onChangeText={setSearch}
            placeholder={tr(lang, 'Search listings...', 'Пошук запитів...')}
            placeholderTextColor={colors.textLight}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ico n="close" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterChip, showF && { backgroundColor: colors.green, borderColor: colors.green }]}
            onPress={() => setShowF(!showF)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ico n="options-outline" size={14} color={showF ? colors.white : colors.textSub} />
              <Text style={[styles.filterChipTxt, showF && { color: colors.white }]}>
                {tr(lang, 'Filters', 'Фільтри')}
                {af > 0 ? ` (${af})` : ''}
              </Text>
            </View>
          </TouchableOpacity>
          {(['low', 'medium', 'critical'] as const).map((u) => {
            const urg = URG[u];
            const a = fu === u;
            return (
              <TouchableOpacity
                key={u}
                style={[styles.filterChip, a && { backgroundColor: urg.color, borderColor: urg.color }]}
                onPress={() => setFu(a ? '' : u)}
              >
                <Text style={[styles.filterChipTxt, a && { color: colors.white }]}>
                  {tr(lang, urg.label, urg.labelUa)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {showF && (
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <Text style={[styles.secLbl, { marginBottom: 8 }]}>{tr(lang, 'Category', 'Категорія')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['', ...RES_EN].map((cat, i) => {
              const a = fc === cat;
              const label = cat === '' ? tr(lang, 'All', 'Всі') : lang === 'ua' ? RES_UA[i - 1] : cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFc(cat)}
                  style={[styles.catChip, a && { backgroundColor: colors.green, borderColor: colors.green }]}
                >
                  {cat === '' ? (
                    <Ico n="apps-outline" size={14} color={a ? colors.white : colors.textSub} />
                  ) : (
                    <Ionicons
                      name={catIcon(cat) as IcoName}
                      size={14}
                      color={a ? colors.white : colors.textSub}
                    />
                  )}
                  <Text style={[styles.catChipTxt, a && { color: colors.white }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {af > 0 && (
            <TouchableOpacity
              onPress={() => {
                setFu('');
                setFc('');
              }}
              style={{ marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ico n="close-circle-outline" size={14} color={colors.red} />
              <Text style={{ color: colors.red, fontSize: 13, fontWeight: '500' }}>
                {tr(lang, 'Clear filters', 'Скинути')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View
        style={{
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={styles.secLbl}>{tr(lang, 'Active listings', 'Активні запити')}</Text>
        <Text style={{ color: colors.textLight, fontSize: 12 }}>
          {filtered.length}
          {resources.length !== filtered.length ? ` / ${resources.length}` : ''}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {loading ? (
          <View style={{ paddingTop: 60, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={colors.green} size="large" />
            <Text style={{ color: colors.textSub }}>{tr(lang, 'Loading...', 'Завантаження...')}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center', gap: 12 }}>
            <Ionicons
              name={search || af > 0 ? 'search-outline' : 'mail-open-outline'}
              size={52}
              color={colors.textLight}
            />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
              {search || af > 0
                ? tr(lang, 'Nothing found', 'Нічого не знайдено')
                : tr(lang, 'No listings yet', 'Запитів поки немає')}
            </Text>
            <Text style={{ color: colors.textSub, textAlign: 'center' }}>
              {search || af > 0
                ? tr(lang, 'Try different search', 'Спробуйте інший запит')
                : tr(lang, 'Tap + to add first', 'Натисніть + щоб додати')}
            </Text>
          </View>
        ) : (
          filtered.map((r) => (
            <ResourceCard
              key={r.id}
              r={r}
              user={user}
              myCoords={coords}
              lang={lang}
              onPress={() => {
                onSelectResource(r);
                onNavigate(r.user_id === user.id ? 'MyTrade' : 'ActiveTrade');
              }}
              onPressUser={() => {
                if (r.user_id !== user.id) onSelectUser(r.user_id, r.username);
              }}
            />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => onNavigate('Create')} activeOpacity={0.9}>
        <Ico n="add" size={30} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}
