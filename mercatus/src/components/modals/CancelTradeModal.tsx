import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import { styles } from '../../styles';
import {
  CANCEL_IDS,
  CANCEL_ICONS,
  CANCEL_REASONS_EN,
  CANCEL_REASONS_UA,
} from '../../constants/modals';
import { tr } from '../../i18n';
import type { Lang } from '../../types/navigation';
import { cancelTrade, Resource, User } from '../../../supabase';
import { Ico } from '../Ico';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  lang: Lang;
  user: User;
  resource: Resource;
  otherUserId: string;
};

export function CancelTradeModal({
  visible,
  onClose,
  onConfirmed,
  lang,
  resource,
  otherUserId,
}: Props) {
  const [sel, setSel] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function confirm() {
    if (!sel) return;
    setLoading(true);
    await cancelTrade(resource, sel, otherUserId);
    setLoading(false);
    setDone(true);
    setTimeout(() => {
      onConfirmed();
      setDone(false);
      setSel('');
    }, 1600);
  }

  const reasons = CANCEL_IDS.map((id, i) => ({
    id,
    icon: CANCEL_ICONS[i],
    l: tr(lang, CANCEL_REASONS_EN[i], CANCEL_REASONS_UA[i]),
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
              <Ico n="checkmark-circle-outline" size={52} color={colors.green} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
                {tr(lang, 'Deal cancelled', 'Угоду скасовано')}
              </Text>
              <Text style={{ color: colors.textSub, fontSize: 14 }}>
                {tr(lang, 'Reputation -15', 'Репутацію знижено на 15')}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{tr(lang, 'Cancel Deal', 'Скасувати угоду')}</Text>
              <Text style={[styles.sheetSub, { marginBottom: 20 }]}>
                {tr(lang, 'Select a reason', 'Оберіть причину')}
              </Text>
              {reasons.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setSel(r.id)}
                  style={[
                    styles.reasonRow,
                    sel === r.id && { backgroundColor: colors.redLight, borderColor: colors.red },
                  ]}
                >
                  <Ionicons name={r.icon} size={22} color={sel === r.id ? colors.red : colors.textSub} />
                  <Text
                    style={{
                      color: sel === r.id ? colors.red : colors.text,
                      fontSize: 15,
                      flex: 1,
                      fontWeight: sel === r.id ? '600' : '400',
                    }}
                  >
                    {r.l}
                  </Text>
                  {sel === r.id && <Ico n="checkmark" size={18} color={colors.red} />}
                </TouchableOpacity>
              ))}
              <View
                style={{
                  backgroundColor: '#FFF4E5',
                  borderRadius: 12,
                  padding: 14,
                  marginTop: 8,
                  marginBottom: 4,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <Ico n="warning-outline" size={16} color={colors.yellow} />
                <Text style={{ color: colors.yellow, fontSize: 13, lineHeight: 19, flex: 1 }}>
                  {tr(
                    lang,
                    'Other party reputation -15. Cannot be undone.',
                    'Репутація іншої сторони -15. Незворотна дія.',
                  )}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.btn, { marginTop: 12, backgroundColor: sel ? colors.red : colors.border }]}
                onPress={confirm}
                disabled={!sel || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.btnTxt, { color: sel ? '#fff' : colors.textLight }]}>
                    {tr(lang, 'Cancel Deal', 'Скасувати угоду')}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnOut, { marginTop: 10 }]} onPress={onClose}>
                <Text style={styles.btnOutTxt}>{tr(lang, 'Go back', 'Назад')}</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
