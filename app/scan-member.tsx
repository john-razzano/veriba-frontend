import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lookupMember } from '@/src/lib/veriba-api';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';

const QR_PREFIX = 'veriba:member:';

/**
 * Full-screen QR scanner for a patient's member code (Account → "My clinic
 * code"), pushed from the wizard's Patient Link step. A real navigated
 * screen rather than an RN <Modal> — hosting CameraView inside RN's Modal
 * is a known source of a preview that renders but never actually scans.
 */
export default function ScanMemberScreen() {
  const router = useRouter();
  const followUpRequest = useProveStore((state) => state.wizard.followUpRequest);
  const setWizardFollowUpRequest = useProveStore((state) => state.setWizardFollowUpRequest);
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  useEffect(() => {
    if (!permission?.granted) void requestPermission();
  }, [permission?.granted, requestPermission]);

  const onScanned = ({ data }: { data: string }) => {
    if (handled.current || !data.startsWith(QR_PREFIX)) return;
    handled.current = true;
    const userId = data.slice(QR_PREFIX.length).trim();
    lookupMember({ userId })
      .then((res) => res.member ?? { id: userId })
      .catch(() => ({ id: userId, name: null, initials: null }))
      .then((member) => {
        setWizardFollowUpRequest({
          patientUserId: member.id,
          memberMatchName: member.name ?? null,
          patientFirstName:
            followUpRequest.patientFirstName || (member.name ? member.name.split(' ')[0] : ''),
        });
        router.back();
      });
  };

  return (
    <View style={styles.wrap}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          // iOS defaults autofocus OFF — without it the lens stays fixed
          // at a distance that never resolves a QR held close to a screen.
          autofocus="on"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
      ) : (
        <View style={styles.permission}>
          <Ionicons name="camera-outline" size={30} color={colors.white} />
          <Text style={styles.permissionText}>
            Camera access is needed to scan the patient's member code.
          </Text>
          <Pressable style={styles.permissionBtn} onPress={() => void requestPermission()}>
            <Text style={styles.permissionBtnText}>Allow camera</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.hint}>Ask the patient to open Account → “My clinic code”</Text>
        <View style={styles.frame} />
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: 60,
  },
  hint: {
    ...typography.bodySm,
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  frame: {
    width: 230,
    height: 230,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  closeText: { fontFamily: fonts.body.bold, fontSize: 13, color: colors.white },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  permissionText: {
    ...typography.bodySm,
    color: colors.white,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: colors.copper,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  permissionBtnText: { fontFamily: fonts.body.bold, fontSize: 12.5, color: colors.white },
});
