import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';

import { ChainOfCustodyCard } from '@/src/components/chain-of-custody-card';
import { PhotoPairCard } from '@/src/components/photo-preview';
import { ChipButton, GradientButton, OutlineButton, SectionCard, StatusPill } from '@/src/components/ui';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { TREATMENTS, OBSCURE_OPTIONS } from '@/src/types';
import { formatTimestamp, consentLabel } from '@/src/utils/format';
import { useProveStore } from '@/src/store/prove-store';
import { createPhotoObscuration, getDefaultObscureRegion } from '@/src/utils/obscure';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useProveStore((state) => state.sessions.find((item) => item.id === id));
  const updateSession = useProveStore((state) => state.updateSession);
  const unpublishSession = useProveStore((state) => state.unpublishSession);
  const hydrateWizardFromSession = useProveStore((state) => state.hydrateWizardFromSession);

  const [editing, setEditing] = useState(false);
  const [draftTreatment, setDraftTreatment] = useState(session?.treatment ?? '');
  const [draftObscureMode, setDraftObscureMode] = useState(session?.obscureMode ?? 'none');

  const draftCategory = useMemo(
    () => TREATMENTS.find((item) => item.label === draftTreatment)?.category ?? session?.category,
    [draftTreatment, session?.category]
  );
  const previewObscureRegion = useMemo(
    () =>
      draftObscureMode === session?.obscureMode
        ? session?.obscureRegion
        : getDefaultObscureRegion(draftObscureMode),
    [draftObscureMode, session?.obscureMode, session?.obscureRegion]
  );
  const previewBeforeObscuration = useMemo(
    () =>
      draftObscureMode === session?.obscureMode
        ? session?.beforeObscuration
        : {
            ...(session?.beforeObscuration ?? createPhotoObscuration(session?.obscureMode ?? 'none')),
            mode: draftObscureMode,
            region: previewObscureRegion ?? getDefaultObscureRegion(draftObscureMode),
          },
    [
      draftObscureMode,
      previewObscureRegion,
      session?.beforeObscuration,
      session?.obscureMode,
    ]
  );
  const previewAfterObscuration = useMemo(
    () =>
      draftObscureMode === session?.obscureMode
        ? session?.afterObscuration
        : {
            ...(session?.afterObscuration ?? createPhotoObscuration(session?.obscureMode ?? 'none')),
            mode: draftObscureMode,
            region: previewObscureRegion ?? getDefaultObscureRegion(draftObscureMode),
          },
    [
      draftObscureMode,
      previewObscureRegion,
      session?.afterObscuration,
      session?.obscureMode,
    ]
  );

  if (!session) {
    return null;
  }

  const saveChanges = () => {
    updateSession(session.id, {
      treatment: draftTreatment,
      category: draftCategory,
      obscureMode: draftObscureMode,
    });
    setEditing(false);
    Alert.alert('Changes saved', 'Changes saved and SEO metadata refreshed.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={16} color={colors.textMid} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <View>
            <Text style={styles.initials}>{session.patientInitials}</Text>
            <Text style={styles.date}>{formatTimestamp(session.publishedAt ?? session.capturedAt)}</Text>
          </View>
          <StatusPill status={session.status} />
        </View>

        <PhotoPairCard
          beforeUri={session.beforePhotoUri}
          afterUri={session.afterPhotoUri}
          beforeObscuration={previewBeforeObscuration}
          afterObscuration={previewAfterObscuration}
          treatment={draftTreatment}
          location="Luxe Aesthetics · Reno, NV"
          seed={session.id}
          verified
        />

        <ChainOfCustodyCard session={session} />

        <SectionCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Details</Text>
            <Pressable onPress={() => setEditing((value) => !value)}>
              <Text style={styles.editText}>{editing ? 'Cancel' : 'Edit'}</Text>
            </Pressable>
          </View>

          {editing ? (
            <>
              <Text style={styles.label}>Treatment</Text>
              <View style={styles.chipList}>
                {TREATMENTS.map((option) => (
                  <ChipButton
                    key={option.label}
                    label={option.label}
                    active={draftTreatment === option.label}
                    onPress={() => setDraftTreatment(option.label)}
                    style={styles.fullWidthChip}
                  />
                ))}
              </View>

              <Text style={styles.label}>Photo Obscuring</Text>
              <View style={styles.twoColumn}>
                {OBSCURE_OPTIONS.map((option) => (
                  <ChipButton
                    key={option.id}
                    label={`${option.icon} ${option.label}`}
                    sublabel={option.description}
                    active={draftObscureMode === option.id}
                    onPress={() => setDraftObscureMode(option.id)}
                    style={styles.halfChip}
                  />
                ))}
              </View>
              <GradientButton label="Save Changes" onPress={saveChanges} style={styles.saveButton} />
            </>
          ) : (
            <View style={styles.infoList}>
              <InfoRow label="Treatment" value={session.treatment} />
              <InfoRow
                label="Photo Obscuring"
                value={OBSCURE_OPTIONS.find((option) => option.id === session.obscureMode)?.label ?? 'None'}
              />
              <InfoRow label="Consent Level" value={consentLabel(session.consentTier)} />
              <InfoRow label="Page Views" value={String(session.pageViews)} />
            </View>
          )}
        </SectionCard>

        {session.status === 'published' ? (
          <SectionCard>
            <Text style={styles.cardTitle}>SEO Metadata</Text>
            <View style={styles.infoList}>
              <InfoRow label="Page Title" value={session.seo.title} />
              <InfoRow label="Image Alt" value={session.seo.altText} />
              <InfoRow label="URL" value={session.seo.url} />
            </View>
          </SectionCard>
        ) : null}

        {session.status === 'published' ? (
          <OutlineButton
            label="Unpublish This Session"
            destructive
            onPress={() => {
              unpublishSession(session.id);
              Alert.alert('Session unpublished', 'The session has been removed from publish destinations.');
            }}
          />
        ) : (
          <GradientButton
            label="Resume — Get Consent & Publish"
            onPress={() => {
              hydrateWizardFromSession(session.id);
              router.push('/wizard/consent');
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.textMid,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  initials: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.text,
  },
  date: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
  },
  editText: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.copper,
  },
  infoList: {
    gap: spacing.md,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  infoValue: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text,
  },
  label: {
    ...typography.label,
    color: colors.textLight,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chipList: {
    gap: spacing.sm,
  },
  twoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fullWidthChip: {
    width: '100%',
  },
  halfChip: {
    width: '48%',
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});
