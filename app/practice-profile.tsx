import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppInput, AvatarBadge, GradientButton, OutlineButton } from '@/src/components/ui';
import { updateMyPractice, uploadPracticeAvatar } from '@/src/lib/veriba-api';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';

const BIO_MAX = 600;

const HOURS_DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const;

/**
 * Provider editor for the public clinic page (PRACTICE-PROFILE-SPEC Phase 1).
 * Providers curate presentation; verified counts and custody stay derived.
 */
export default function PracticeProfileScreen() {
  const router = useRouter();
  const practice = useProveStore((state) => state.practice);
  const refreshPractice = useProveStore((state) => state.refreshPractice);

  const [name, setName] = useState(practice?.name ?? '');
  const [location, setLocation] = useState(practice?.location ?? '');
  const [website, setWebsite] = useState(practice?.website ?? '');
  const [bookingUrl, setBookingUrl] = useState(practice?.bookingUrl ?? '');
  const [bio, setBio] = useState(practice?.bio ?? '');
  const [hours, setHours] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      HOURS_DAYS.map((d) => [d.key, practice?.hours?.[d.key] ?? ''])
    )
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(practice?.avatarUrl ?? null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarChanged(true);
    }
  };

  const onSave = async () => {
    if (!name.trim() || !location.trim()) {
      Alert.alert('Missing details', 'Name and location are required.');
      return;
    }
    setSaving(true);
    try {
      await updateMyPractice({
        name: name.trim(),
        location: location.trim(),
        website: website.trim() || null,
        booking_url: bookingUrl.trim() || null,
        bio: bio.trim() || null,
        hours: Object.values(hours).some((v) => v.trim())
          ? Object.fromEntries(
              HOURS_DAYS.map((d) => [d.key, hours[d.key]?.trim() || null])
            )
          : null,
      });
      if (avatarChanged && avatarUri) {
        await uploadPracticeAvatar({ uri: avatarUri });
      }
      await refreshPractice();
      Alert.alert('Saved', 'Your public page is updated.', [
        {
          text: 'View public page',
          onPress: () =>
            practice?.widgetSlug
              ? router.push(`/clinic/${practice.widgetSlug}` as Href)
              : router.back(),
        },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        'Unable to save',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.headRow}>
          <Pressable style={styles.backCircle} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={styles.heading}>Public page</Text>
          <View style={styles.backCircle} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.note}>
            This is what members see. Your verified-results count and custody badges are
            earned automatically and can't be edited.
          </Text>

          <Pressable style={styles.avatarWrap} onPress={() => void pickAvatar()}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} transition={150} />
            ) : (
              <AvatarBadge initials={name.slice(0, 2).toUpperCase() || 'VA'} size={84} />
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera-outline" size={13} color={colors.white} />
            </View>
          </Pressable>

          <Text style={styles.fieldLabel}>CLINIC NAME</Text>
          <AppInput value={name} onChangeText={setName} placeholder="Clinic name" />
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <AppInput value={location} onChangeText={setLocation} placeholder="City, State" />
          <Text style={styles.fieldLabel}>WEBSITE</Text>
          <AppInput
            value={website}
            onChangeText={setWebsite}
            placeholder="https://yourclinic.com"
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.fieldLabel}>BOOKING LINK — POWERS "BOOK CONSULT"</Text>
          <AppInput
            value={bookingUrl}
            onChangeText={setBookingUrl}
            placeholder="https://yourclinic.com/book"
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.fieldLabel}>
            ABOUT · {bio.length}/{BIO_MAX}
          </Text>
          <TextInput
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
            placeholder="Tell members what your clinic is about…"
            placeholderTextColor={colors.textLight}
            multiline
            style={styles.bioInput}
          />

          <Text style={styles.fieldLabel}>HOURS — LEAVE A DAY BLANK IF CLOSED</Text>
          {HOURS_DAYS.map((day) => (
            <View key={day.key} style={styles.hoursRow}>
              <Text style={styles.hoursDay}>{day.label}</Text>
              <AppInput
                style={styles.hoursInput}
                value={hours[day.key]}
                onChangeText={(t) => setHours((prev) => ({ ...prev, [day.key]: t }))}
                placeholder="9:00–17:00"
                autoCapitalize="none"
              />
            </View>
          ))}

          <View style={styles.actions}>
            <GradientButton
              label={saving ? 'Saving…' : 'Save public page'}
              onPress={() => void onSave()}
              disabled={saving}
            />
            {practice?.widgetSlug ? (
              <OutlineButton
                label="Preview as member"
                onPress={() => router.push(`/clinic/${practice.widgetSlug}` as Href)}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
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
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
  note: {
    ...typography.bodyXs,
    color: colors.textMid,
    lineHeight: 16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatarWrap: { alignSelf: 'center', marginBottom: spacing.md },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.bgInput },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.copper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textLight,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  bioInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  hoursDay: { ...typography.bodySm, color: colors.textMid, width: 82 },
  hoursInput: { flex: 1 },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
