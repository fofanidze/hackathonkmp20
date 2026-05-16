import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { RES_EN, RES_UA } from '../constants/categories';
import { tr } from '../i18n';
import type { Lang } from '../types/navigation';
import { addResource, Resource, User } from '../../supabase';
import { Ico } from '../components/Ico';
import { CatPickBtn } from '../components/CatPickBtn';

type Props = {
  onBack: () => void;
  lang: Lang;
  user: User;
  onPublished: (r: Resource) => void;
};

export function CreateScreen({ onBack, lang, user, onPublished }: Props) {
  const [have, setHave] = useState(0);
  const [need, setNeed] = useState(1);
  const [urgency, setUrgency] = useState('medium');
  const [desc, setDesc] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const cats = lang === 'ua' ? RES_UA : RES_EN;

  async function pickPhoto() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) {
      Alert.alert(tr(lang, 'Permission needed', 'Потрібен дозвіл'));
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.4,
      base64: true,
    });
    if (!r.canceled && r.assets[0]) {
      setPhotoUri(r.assets[0].uri);
      setPhotoB64(r.assets[0].base64 ?? null);
    }
  }

  async function takePhoto() {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) {
      Alert.alert(tr(lang, 'Permission needed', 'Потрібен дозвіл'));
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.4,
      base64: true,
    });
    if (!r.canceled && r.assets[0]) {
      setPhotoUri(r.assets[0].uri);
      setPhotoB64(r.assets[0].base64 ?? null);
    }
  }

  async function handle() {
    setLoading(true);
    let lat: number | undefined;
    let lng: number | undefined;
    let address: string | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = l.coords.latitude;
        lng = l.coords.longitude;
        const g = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (g[0]) {
          address = [g[0].street, g[0].district, g[0].city].filter(Boolean).join(', ');
        }
      }
    } catch {}
    const photoUrl = photoB64 ? `data:image/jpeg;base64,${photoB64}` : undefined;
    const created = await addResource(
      user.id,
      user.username,
      RES_EN[have],
      RES_EN[need],
      urgency,
      lat,
      lng,
      address,
      desc.trim() || undefined,
      photoUrl,
    );
    setLoading(false);
    if (!created) {
      Alert.alert(tr(lang, 'Error', 'Помилка'), tr(lang, 'Failed to publish', 'Не вдалось опублікувати'));
      return;
    }
    setSuccess(true);
    setTimeout(() => onPublished(created), 1200);
  }

  const urgLvls = [
    { id: 'low', lEn: 'Low', lUa: 'Низька', descEn: 'Not urgent', descUa: 'Не терміново', c: '#2E7D32', bg: '#E8F5E9' },
    { id: 'medium', lEn: 'Medium', lUa: 'Середня', descEn: 'Preferably soon', descUa: 'Бажано скоро', c: '#E65100', bg: '#FFF4E5' },
    { id: 'critical', lEn: 'Critical', lUa: 'Критична', descEn: 'Urgent', descUa: 'Дуже терміново', c: '#C62828', bg: '#FFF0F3' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
          <Ico n="arrow-back" size={20} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.screenTitle}>{tr(lang, 'New listing', 'Новий запит')}</Text>
          <Text style={{ color: colors.textSub, fontSize: 13 }}>
            {tr(lang, 'Fill in your exchange details', 'Заповніть деталі обміну')}
          </Text>
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 20 }}
      >
        <View>
          <Text style={[styles.secLbl, { marginBottom: 12 }]}>
            {tr(lang, 'What are you offering?', 'Що у вас є?')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cats.map((cat, i) => (
              <CatPickBtn
                key={i}
                label={cat}
                categoryEn={RES_EN[i]}
                selected={have === i}
                accent="green"
                onPress={() => setHave(i)}
              />
            ))}
          </View>
        </View>
        <View>
          <Text style={[styles.secLbl, { marginBottom: 12 }]}>
            {tr(lang, 'What are you looking for?', 'Що вам потрібно?')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cats.map((cat, i) => (
              <CatPickBtn
                key={i}
                label={cat}
                categoryEn={RES_EN[i]}
                selected={need === i}
                accent="blue"
                onPress={() => setNeed(i)}
              />
            ))}
          </View>
        </View>
        <View>
          <Text style={[styles.secLbl, { marginBottom: 12 }]}>{tr(lang, 'Urgency', 'Терміновість')}</Text>
          <View style={{ gap: 10 }}>
            {urgLvls.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={[styles.urgRow, urgency === u.id && { borderColor: u.c, backgroundColor: u.bg }]}
                onPress={() => setUrgency(u.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: urgency === u.id ? u.c : colors.text,
                      fontSize: 15,
                      fontWeight: urgency === u.id ? '700' : '500',
                    }}
                  >
                    {tr(lang, u.lEn, u.lUa)}
                  </Text>
                  <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                    {tr(lang, u.descEn, u.descUa)}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: urgency === u.id ? u.c : colors.border,
                    backgroundColor: urgency === u.id ? u.c : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {urgency === u.id && <Ico n="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View>
          <Text style={[styles.secLbl, { marginBottom: 8 }]}>
            {tr(lang, 'Description (optional)', "Опис (необов'язково)")}
          </Text>
          <TextInput
            style={[styles.field, { height: 90, textAlignVertical: 'top', paddingTop: 14 }]}
            value={desc}
            onChangeText={setDesc}
            placeholder={tr(lang, 'Details, quantity, terms...', 'Деталі, кількість, умови...')}
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={300}
          />
          <Text style={{ color: colors.textLight, fontSize: 11, marginTop: 4, textAlign: 'right' }}>
            {desc.length}/300
          </Text>
        </View>
        <View>
          <Text style={[styles.secLbl, { marginBottom: 8 }]}>
            {tr(lang, 'Photo (optional)', "Фото (необов'язково)")}
          </Text>
          {photoUri ? (
            <View>
              <Image
                source={{ uri: photoUri }}
                style={{ width: '100%', height: 180, borderRadius: 14, marginBottom: 10 }}
                resizeMode="cover"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.btnOut,
                    { flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                  ]}
                  onPress={pickPhoto}
                >
                  <Ico n="image-outline" size={16} color={colors.text} />
                  <Text style={[styles.btnOutTxt, { fontSize: 13 }]}>{tr(lang, 'Replace', 'Замінити')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.btnOut,
                    {
                      flex: 1,
                      paddingVertical: 12,
                      borderColor: colors.red,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    },
                  ]}
                  onPress={() => {
                    setPhotoUri(null);
                    setPhotoB64(null);
                  }}
                >
                  <Ico n="close" size={16} color={colors.red} />
                  <Text style={[styles.btnOutTxt, { fontSize: 13, color: colors.red }]}>
                    {tr(lang, 'Remove', 'Видалити')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Ico n="image-outline" size={28} color={colors.textSub} />
                <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '500', marginTop: 6 }}>
                  {tr(lang, 'Gallery', 'Галерея')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Ico n="camera-outline" size={28} color={colors.textSub} />
                <Text style={{ color: colors.textSub, fontSize: 12, fontWeight: '500', marginTop: 6 }}>
                  {tr(lang, 'Camera', 'Камера')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
      <View style={styles.footer}>
        {success ? (
          <View
            style={[
              styles.btn,
              { backgroundColor: '#2E7D32', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
            ]}
          >
            <Ico n="checkmark-circle-outline" size={20} color={colors.white} />
            <Text style={styles.btnTxt}>{tr(lang, 'Published!', 'Опубліковано!')}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnTxt}>{tr(lang, 'Publish listing', 'Опублікувати')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
