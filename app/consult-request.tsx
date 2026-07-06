import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppInput } from '@/src/components/ui';
import { createConsultRequest } from '@/src/lib/veriba-api';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';

/**
 * Member → clinic consult request (GROWTH-SPEC §1). One message with contact
 * details, not a chat thread — the clinic responds by phone or email.
 */
export default function ConsultRequestScreen() {
  const router = useRouter();
  const { practiceId, practiceName, sessionId, treatment } = useLocalSearchParams<{
    practiceId: string;
    practiceName?: string;
    sessionId?: string;
    treatment?: string;
  }>();
  const user = useProveStore((state) => state.user);
  const [message, setMessage] = useState(
    treatment ? `Hi — I’m interested in ${treatment}.` : ''
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = !!practiceId && email.trim().length > 3 && !sending;

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await createConsultRequest({
        practice_id: practiceId,
        session_id: sessionId ?? null,
        message: message.trim() || null,
        contact_email: email.trim(),
        contact_phone: phone.trim() || null,
      });
      Alert.alert(
        'Request sent',
        `${practiceName ?? 'The clinic'} will reach out using the contact details you provided.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      Alert.alert(
        'Unable to send',
        msg.toLowerCase().includes('already')
          ? 'You already have an open request with this clinic — they’ll be in touch.'
          : msg || 'Please try again.'
      );
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headRow}>
        <Pressable style={styles.backCircle} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.heading}>Request a consult</Text>
        <View style={styles.backCircle} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          <Text style={styles.clinic}>{practiceName ?? 'Clinic'}</Text>
          {treatment ? <Text style={styles.context}>About: {treatment}</Text> : null}

          <Text style={styles.label}>MESSAGE</Text>
          <AppInput
            style={styles.messageInput}
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="What are you hoping to achieve? Any questions for the clinic?"
          />

          <Text style={styles.label}>CONTACT EMAIL</Text>
          <AppInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />

          <Text style={styles.label}>PHONE — OPTIONAL</Text>
          <AppInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="(555) 555-0100"
          />

          <Text style={styles.privacyNote}>
            Only this clinic sees your request. They’ll respond by email or phone —
            there’s no in-app chat yet.
          </Text>

          <Pressable
            style={[styles.sendWrap, !canSend && { opacity: 0.5 }]}
            disabled={!canSend}
            onPress={() => void onSend()}>
            <LinearGradient
              colors={[colors.copper, colors.brown, colors.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}>
              <Text style={styles.sendText}>{sending ? 'Sending…' : 'Send request'}</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 4,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { fontFamily: fonts.display.medium, fontSize: 20, color: '#23201c' },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  clinic: { fontFamily: fonts.body.bold, fontSize: 15, color: colors.text, marginTop: 8 },
  context: { ...typography.bodySm, color: colors.textMid, marginTop: 2 },
  label: {
    ...typography.label,
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  messageInput: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  privacyNote: {
    ...typography.bodyXs,
    color: colors.textLight,
    marginTop: spacing.md,
    lineHeight: 17,
  },
  sendWrap: { borderRadius: radii.lg, overflow: 'hidden', marginTop: spacing.md },
  sendBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontFamily: fonts.body.bold, fontSize: 13.5, color: colors.white },
});
