import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { CatIcon } from './CatIcon';

type Props = {
  label: string;
  categoryEn: string;
  selected: boolean;
  accent: 'green' | 'blue';
  onPress: () => void;
};

export function CatPickBtn({ label, categoryEn, selected, accent, onPress }: Props) {
  const accentColor = accent === 'green' ? colors.green : colors.blue;
  const accentLight = accent === 'green' ? colors.greenLight : colors.blueLight;

  return (
    <TouchableOpacity
      style={[
        styles.catBtn,
        selected && { borderColor: accentColor, backgroundColor: accentLight },
      ]}
      onPress={onPress}
    >
      <View style={styles.catBtnIcon}>
        <CatIcon item={categoryEn} size={26} color={selected ? accentColor : colors.textSub} />
      </View>
      <Text
        style={{
          fontSize: 11,
          color: selected ? accentColor : colors.textSub,
          textAlign: 'center',
          fontWeight: selected ? '700' : '500',
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
