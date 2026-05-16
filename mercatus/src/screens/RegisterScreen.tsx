import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { Lang } from '../types/navigation';
import { registerUser, User } from '../../supabase';
import { Ico } from '../components/Ico';

type Props = {
  onSuccess: (u: User) => void;
  onBack: () => void;
  lang: Lang;
};

export function RegisterScreen({ onSuccess, onBack, lang }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!username || !password || !confirm) {
      setError(tr(lang, 'Fill all fields', 'Заповніть всі поля'));
      return;
    }
    if (password !== confirm) {
      setError(tr(lang, 'Passwords do not match', 'Паролі не співпадають'));
      return;
    }
    if (password.length < 6) {
      setError('Min 6 chars');
      return;
    }
    setLoading(true);
    setError('');
    const r = await registerUser(username, password, lang);
    setLoading(false);
    if (r.ok && r.user) onSuccess(r.user);
    else setError(r.error ?? 'Error');
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
          <Ico n="arrow-back" size={20} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={styles.authTitle}>{tr(lang, 'Create account', 'Створіть акаунт')}</Text>
        <Text style={[styles.authSub, { marginBottom: 36 }]}>
          {tr(lang, 'Join the exchange network', 'Приєднайтесь до мережі обміну')}
        </Text>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{tr(lang, 'Username', 'Імʼя')}</Text>
          <TextInput
            style={styles.field}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholderTextColor={colors.textLight}
            placeholder="min 3 chars"
          />
        </View>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{tr(lang, 'Password', 'Пароль')}</Text>
          <TextInput
            style={styles.field}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={colors.textLight}
            placeholder="min 6 chars"
          />
        </View>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{tr(lang, 'Confirm', 'Підтвердіть')}</Text>
          <TextInput
            style={styles.field}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholderTextColor={colors.textLight}
            placeholder={tr(lang, 'Repeat', 'Повторіть')}
          />
        </View>
        {error ? (
          <View style={styles.errBox}>
            <Text style={styles.errTxt}>{error}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={[styles.btn, { marginTop: 28 }]} onPress={handle} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnTxt}>{tr(lang, 'Create account', 'Зареєструватись')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
