import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { Lang } from '../types/navigation';
import { loginUser, User } from '../../supabase';
import { Ico } from '../components/Ico';

type Props = {
  onSuccess: (u: User) => void;
  onBack: () => void;
  onRegister: () => void;
  lang: Lang;
};

export function LoginScreen({ onSuccess, onBack, onRegister, lang }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!username || !password) {
      setError(tr(lang, 'Fill all fields', 'Заповніть всі поля'));
      return;
    }
    setLoading(true);
    setError('');
    const r = await loginUser(username, password);
    setLoading(false);
    if (r.ok && r.user) onSuccess(r.user);
    else setError(tr(lang, 'Wrong credentials', 'Невірний логін або пароль'));
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
          <Ico n="arrow-back" size={20} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={styles.authTitle}>{tr(lang, 'Welcome back', 'Ласкаво просимо')}</Text>
        <Text style={[styles.authSub, { marginBottom: 36 }]}>
          {tr(lang, 'Log in to your account', 'Увійдіть до акаунту')}
        </Text>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{tr(lang, 'Username', 'Імʼя')}</Text>
          <TextInput
            style={styles.field}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholderTextColor={colors.textLight}
            placeholder={tr(lang, 'Enter username', 'Введіть імʼя')}
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
            placeholder="••••••"
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
            <Text style={styles.btnTxt}>{tr(lang, 'Log in', 'Увійти')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onRegister} style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: colors.textSub, fontSize: 14 }}>
            {tr(lang, 'No account? ', 'Немає акаунту? ')}
            <Text style={{ color: colors.green, fontWeight: '600' }}>
              {tr(lang, 'Sign up', 'Реєстрація')}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
