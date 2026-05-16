import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import { colors } from '../theme/colors';
import { styles } from '../styles';
import { tr } from '../i18n';
import type { Lang } from '../types/navigation';
import { Ico } from '../components/Ico';

type Props = {
  onScanned: (d: string) => void;
  onCancel: () => void;
  lang: Lang;
};

export function QRScannerScreen({ onScanned, onCancel, lang }: Props) {
  const [scanned, setScanned] = useState(false);

  function handle({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={[styles.topBar, { backgroundColor: 'transparent', borderBottomWidth: 0 }]}>
        <TouchableOpacity
          style={[styles.circleBtn, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'transparent' }]}
          onPress={onCancel}
        >
          <Ico n="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {tr(lang, 'Scan QR', 'Сканувати QR')}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            {tr(lang, 'Point at seller QR', 'Наведіть на QR продавця')}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handle}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <View style={{ width: 240, height: 240, borderWidth: 3, borderColor: colors.green, borderRadius: 20 }} />
          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              marginTop: 20,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center' }}>
              {tr(lang, "Point at seller's QR code", 'Наведіть на QR код продавця')}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ padding: 24, paddingBottom: 40 }}>
        <TouchableOpacity style={[styles.btnOut, { borderColor: 'rgba(255,255,255,0.4)' }]} onPress={onCancel}>
          <Text style={[styles.btnOutTxt, { color: '#fff' }]}>{tr(lang, 'Cancel', 'Скасувати')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
