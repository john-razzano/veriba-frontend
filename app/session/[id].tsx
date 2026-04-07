import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChainOfCustodyCard } from '@/src/components/chain-of-custody-card';
import {
  ProgressionCarouselCard,
  type ProgressionCarouselItem,
} from '@/src/components/photo-preview';
import {
  ChipButton,
  GradientButton,
  OutlineButton,
  SectionCard,
  StatusPill,
} from '@/src/components/ui';
import { useProveStore } from '@/src/store/prove-store';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { OBSCURE_OPTIONS, TREATMENTS, type Session } from '@/src/types';
import {
  consentLabel,
  followUpMethodLabel,
  followUpStatusLabel,
  followUpTimingLabel,
  formatCompactDate,
  formatTimestamp,
} from '@/src/utils/format';
import { createPhotoObscuration, getDefaultObscureRegion } from '@/src/utils/obscure';

function getResumeRoute(session: Session) {
  switch (session.status) {
    case 'pending_consent':
      return '/wizard/consent';
    case 'ready_to_publish':
    case 'unpublished':
      return '/wizard/publish';
    case 'pending_after':
    case 'draft':
    default:
      return '/wizard/photos';
  }
}

function getResumeLabel(session: Session) {
  switch (session.status) {
    case 'pending_consent':
      return 'Resume Consent';
    case 'ready_to_publish':
    case 'unpublished':
      return 'Review & Publish';
    case 'pending_after':
      return 'Resume Entry — Add After Photo';
    default:
      return 'Resume Entry';
  }
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const practice = useProveStore((state) => state.practice);
  const session = useProveStore((state) => state.sessions.find((item) => item.id === id));
  const loadSession = useProveStore((state) => state.loadSession);
  const updateSession = useProveStore((state) => state.updateSession);
  const unpublishSession = useProveStore((state) => state.unpublishSession);
  const hydrateWizardFromSession = useProveStore((state) => state.hydrateWizardFromSession);
  const sendSessionFollowUpLink = useProveStore((state) => state.sendSessionFollowUpLink);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftTreatment, setDraftTreatment] = useState(session?.treatment ?? '');
  const [draftObscureMode, setDraftObscureMode] = useState(session?.obscureMode ?? 'none');

  useEffect(() => {
    let active = true;

    if (!id) {
      return;
    }

    setLoading(true);
    void loadSession(id)
      .catch(() => {
        if (active) {
          Alert.alert('Unable to load session', 'Please try again.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, loadSession]);

  useEffect(() => {
    setDraftTreatment(session?.treatment ?? '');
    setDraftObscureMode(session?.obscureMode ?? 'none');
  }, [session?.obscureMode, session?.treatment]);

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
    [draftObscureMode, previewObscureRegion, session?.beforeObscuration, session?.obscureMode]
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
    [draftObscureMode, previewObscureRegion, session?.afterObscuration, session?.obscureMode]
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    console.log('[session.detail] session state', {
      id: session.id,
      status: session.status,
      beforePhotoUri: session.beforePhotoUri,
      afterPhotoUri: session.afterPhotoUri,
      photos: session.photos.map((photo) => ({
        id: photo.id,
        kind: photo.kind,
        uri: photo.uri,
        capturedAt: photo.capturedAt,
      })),
    });
  }, [session]);

  if (!session && loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>Loading session…</Text>
          <Text style={styles.loadingText}>Fetching session details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>Session not found</Text>
          <Text style={styles.loadingText}>This session could not be loaded.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const saveChanges = async () => {
    try {
      setSaving(true);
      await updateSession(session.id, {
        treatment: draftTreatment,
        category: draftCategory,
        obscureMode: draftObscureMode,
      });
      setEditing(false);
      Alert.alert('Changes saved', 'Treatment and obscuring settings were updated.');
    } catch (error) {
      Alert.alert(
        'Unable to save changes',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const carouselItems: ProgressionCarouselItem[] = session.photos.map((photo, index) => ({
    id: photo.id,
    title: photo.label || (index === 0 ? 'Baseline' : 'After'),
    subtitle: photo.submittedBy === 'patient' ? 'Submitted by patient' : 'Captured by provider',
    meta: formatCompactDate(photo.capturedAt),
    uri: photo.uri,
    obscuration: index === 0 ? previewBeforeObscuration : previewAfterObscuration,
    variant: index === 0 ? 'before' : 'after',
    badge: photo.submittedBy === 'patient' ? 'Patient' : 'Provider',
  }));

  if (carouselItems.length === 0 && session.beforePhotoUri) {
    carouselItems.push({
      id: `${session.id}-before-fallback`,
      title: 'Baseline',
      subtitle: 'Captured by provider',
      meta: formatCompactDate(session.capturedAt ?? session.createdAt),
      uri: session.beforePhotoUri,
      obscuration: previewBeforeObscuration,
      variant: 'before',
      badge: 'Provider',
    });
  }

  if (
    carouselItems.length === 1 &&
    !session.photos.some((photo) => photo.kind === 'after') &&
    session.afterPhotoUri
  ) {
    carouselItems.push({
      id: `${session.id}-after-fallback`,
      title: 'After',
      subtitle: 'Captured by provider',
      meta: formatCompactDate(session.updatedAt),
      uri: session.afterPhotoUri,
      obscuration: previewAfterObscuration,
      variant: 'after',
      badge: 'Provider',
    });
  }

  if (session.status === 'pending_after') {
    carouselItems.push({
      id: 'pending-after',
      title: 'After photo still needed',
      subtitle:
        session.followUpRequest?.method === 'patient_link'
          ? 'A patient upload link has been planned for this session.'
          : session.followUpRequest?.method === 'follow_up_visit'
            ? 'The next verified image is planned for a future clinic visit.'
            : 'No after photo has been attached yet.',
      meta:
        session.followUpRequest?.method && session.followUpRequest.method !== 'not_needed'
          ? `${followUpMethodLabel(session.followUpRequest.method)} · ${followUpTimingLabel(session.followUpRequest.timing)}`
          : 'No follow-up scheduled',
      pending: true,
      badge: 'Pending',
    });
  }

  console.log('[session.detail] carousel items', {
    id: session.id,
    count: carouselItems.length,
    items: carouselItems.map((item) => ({
      id: item.id,
      pending: Boolean(item.pending),
      variant: item.variant ?? null,
      uri: item.uri ?? null,
      title: item.title,
    })),
  });

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
            <Text style={styles.date}>{formatTimestamp(session.updatedAt)}</Text>
          </View>
          <StatusPill status={session.status} />
        </View>

        <ProgressionCarouselCard
          items={carouselItems}
          treatment={draftTreatment}
          location={practice ? `${practice.name} · ${practice.location}` : 'Loading practice details…'}
          seed={session.id}
          verified
        />

        <SectionCard>
          <Text style={styles.cardTitle}>Follow-up Workflow</Text>
          <View style={styles.infoList}>
            <InfoRow label="Images on Session" value={String(session.photos.length)} />
            <InfoRow
              label="Current Plan"
              value={
                session.followUpRequest
                  ? followUpMethodLabel(session.followUpRequest.method)
                  : session.status === 'pending_after'
                    ? 'No follow-up scheduled'
                    : 'Not needed'
              }
            />
            {session.followUpRequest ? (
              <>
                <InfoRow
                  label="Follow-up Status"
                  value={followUpStatusLabel(session.followUpRequest.status)}
                />
                <InfoRow
                  label="Target Window"
                  value={followUpTimingLabel(session.followUpRequest.timing)}
                />
                <InfoRow
                  label="Scheduled For"
                  value={formatTimestamp(session.followUpRequest.scheduledFor)}
                />
              </>
            ) : null}
          </View>

          {session.status !== 'published' && session.status !== 'declined' ? (
            <View style={styles.followUpActions}>
              {session.followUpRequest?.id &&
              session.followUpRequest.method === 'patient_link' ? (
                <GradientButton
                  label={
                    session.followUpRequest.status === 'sent'
                      ? 'Resend Patient Upload Link'
                      : 'Send Patient Upload Link'
                  }
                  onPress={() => {
                    void sendSessionFollowUpLink(session.id)
                      .then(() => {
                        Alert.alert(
                          'Follow-up updated',
                          'The patient upload link has been resent.'
                        );
                      })
                      .catch((error) => {
                        Alert.alert(
                          'Unable to send follow-up',
                          error instanceof Error ? error.message : 'Please try again.'
                        );
                      });
                  }}
                />
              ) : null}
              <OutlineButton
                label={getResumeLabel(session)}
                onPress={() => {
                  void hydrateWizardFromSession(session.id).then(() => {
                    router.push(getResumeRoute(session));
                  });
                }}
              />
            </View>
          ) : null}
        </SectionCard>

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
              <GradientButton
                label={saving ? 'Saving…' : 'Save Changes'}
                onPress={() => void saveChanges()}
                style={styles.saveButton}
              />
            </>
          ) : (
            <View style={styles.infoList}>
              <InfoRow label="Treatment" value={session.treatment} />
              <InfoRow
                label="Photo Obscuring"
                value={
                  OBSCURE_OPTIONS.find((option) => option.id === session.obscureMode)?.label ??
                  'None'
                }
              />
              <InfoRow label="Consent Level" value={consentLabel(session.consentTier)} />
              <InfoRow label="Images in Session" value={String(session.photos.length)} />
              <InfoRow label="Page Views" value={String(session.pageViews)} />
            </View>
          )}
        </SectionCard>

        {session.seo ? (
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
            label="Unpublish This Entry"
            destructive
            onPress={() => {
              void unpublishSession(session.id)
                .then(() => {
                  Alert.alert(
                    'Entry unpublished',
                    'This entry has been unpublished.'
                  );
                })
                .catch((error) => {
                  Alert.alert(
                    'Unable to unpublish',
                    error instanceof Error ? error.message : 'Please try again.'
                  );
                });
            }}
          />
        ) : null}
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
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  loadingTitle: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.text,
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.textLight,
    textAlign: 'center',
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
    ...typography.bodySm,
    color: colors.copper,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoRow: {
    gap: 3,
  },
  infoLabel: {
    ...typography.label,
    color: colors.textLight,
  },
  infoValue: {
    ...typography.bodySm,
    color: colors.text,
  },
  followUpActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  chipList: {
    gap: spacing.sm,
  },
  fullWidthChip: {
    width: '100%',
  },
  twoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  halfChip: {
    width: '48%',
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});
