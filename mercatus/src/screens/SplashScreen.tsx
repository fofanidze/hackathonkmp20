import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { Lang, Screen } from '../types/navigation';
import { Ico } from '../components/Ico';

type Props = {
  onNext: (s: Screen) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
};

export function SplashScreen({ onNext, lang, setLang }: Props) {
  return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }]}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 60 }}>
        <TouchableOpacity style={[styles.langChip, lang === 'en' && styles.langChipA]} onPress={() => setLang('en')}>
          <Text style={[styles.langChipTxt, lang === 'en' && { color: colors.white }]}>🇬🇧 EN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langChip, lang === 'ua' && styles.langChipA]} onPress={() => setLang('ua')}>
          <Text style={[styles.langChipTxt, lang === 'ua' && { color: colors.white }]}>🇺🇦 UA</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.splashLogo}>
        <Ico n="swap-horizontal-outline" size={52} color={colors.green} />
      </View>
      <Text style={styles.splashTitle}>{tr(lang, 'Mercatus', 'Меркатус')}</Text>
      <Text style={styles.splashSub}>
        {tr(lang, 'Exchange what you have.\nGet what you need.', 'Обміняй те, що маєш.\nОтримай те, що треба.')}
      </Text>
      <View style={{ width: '100%', paddingHorizontal: 28, gap: 14, marginTop: 52 }}>
        <TouchableOpacity style={styles.btn} onPress={() => onNext('Login')}>
          <Text style={styles.btnTxt}>{tr(lang, 'Log in', 'Увійти')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOut} onPress={() => onNext('Register')}>
          <Text style={styles.btnOutTxt}>{tr(lang, 'Create account', 'Реєстрація')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
