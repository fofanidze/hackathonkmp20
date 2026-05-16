import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { Lang } from '../types/navigation';
import { CatIcon } from './CatIcon';
import { Ico } from './Ico';

type Props = {
  have: string;
  need: string;
  lang: Lang;
  iconSize?: number;
  offeringEn?: string;
  offeringUa?: string;
  lookingEn?: string;
  lookingUa?: string;
  compact?: boolean;
};

export function TradePair({
  have,
  need,
  lang,
  iconSize = 24,
  offeringEn = 'OFFERING',
  offeringUa = 'ПРОПОНУЮ',
  lookingEn = 'LOOKING FOR',
  lookingUa = 'ПОТРІБНО',
  compact = false,
}: Props) {
  const labelMt = compact ? 4 : 6;
  const titleMt = compact ? 2 : 4;
  const titleSize = compact ? 12 : 13;
  const swapSize = compact ? 18 : 20;

  return (
    <View style={styles.tradeRow}>
      <View
        style={[
          styles.tradeBox,
          { backgroundColor: colors.greenLight, borderColor: '#C8E6C9', alignItems: 'center' },
        ]}
      >
        <CatIcon item={have} size={iconSize} color={colors.green} />
        <Text
          style={{
            fontSize: 10,
            color: colors.green,
            fontWeight: '600',
            marginTop: labelMt,
            marginBottom: compact ? 0 : 2,
          }}
        >
          {tr(lang, offeringEn, offeringUa)}
        </Text>
        <Text
          style={{
            fontSize: titleSize,
            fontWeight: '700',
            color: colors.text,
            marginTop: titleMt,
          }}
        >
          {have}
        </Text>
      </View>
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
        <Ico n="swap-horizontal-outline" size={swapSize} color={colors.textLight} />
      </View>
      <View
        style={[
          styles.tradeBox,
          { backgroundColor: colors.blueLight, borderColor: '#BBDEFB', alignItems: 'center' },
        ]}
      >
        <CatIcon item={need} size={iconSize} color={colors.blue} />
        <Text
          style={{
            fontSize: 10,
            color: colors.blue,
            fontWeight: '600',
            marginTop: labelMt,
            marginBottom: compact ? 0 : 2,
          }}
        >
          {tr(lang, lookingEn, lookingUa)}
        </Text>
        <Text
          style={{
            fontSize: titleSize,
            fontWeight: '700',
            color: colors.text,
            marginTop: titleMt,
          }}
        >
          {need}
        </Text>
      </View>
    </View>
  );
}
