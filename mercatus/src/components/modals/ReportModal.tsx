import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import { styles } from '../../styles';
import {
  REPORT_IDS,
  REPORT_ICONS,
  REPORT_LABELS_EN,
  REPORT_LABELS_UA,
} from '../../constants/modals';
import { tr } from '../../i18n';
import type { Lang } from '../../types/navigation';
import { reportUser, User } from '../../../supabase';
import { Ico } from '../Ico';

type Props = {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  reporter: User;
  reportedUsername: string;
  reportedUserId: string;
  resourceId?: string;
};

export function ReportModal({
  visible,
  onClose,
  lang,
  reporter,
  reportedUsername,
  reportedUserId,
  resourceId,
}: Props) {
  const [sel, setSel] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!sel) return;
    setLoading(true);
    await reportUser(reporter.id, reportedUserId, reportedUsername, resourceId, sel);
    setLoading(false);
    setDone(true);
    setTimeout(() => {
      onClose();
      setDone(false);
      setSel('');
    }, 1800);
  }

  const reasons = REPORT_IDS.map((id, i) => ({
    id,
    icon: REPORT_ICONS[i],
    l: tr(lang, REPORT_LABELS_EN[i], REPORT_LABELS_UA[i]),
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
                {tr(lang, 'Report submitted', 'Скаргу надіслано')}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {tr(lang, 'Report', 'Поскаржитись на')} @{reportedUsername}
              </Text>
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
              <TouchableOpacity
                style={[styles.btn, { marginTop: 16, backgroundColor: sel ? colors.red : colors.border }]}
                onPress={submit}
                disabled={!sel || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.btnTxt, { color: sel ? '#fff' : colors.textLight }]}>
                    {tr(lang, 'Submit Report', 'Надіслати')}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
