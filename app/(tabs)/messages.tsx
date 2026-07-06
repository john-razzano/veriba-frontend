import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarBadge } from '@/src/components/ui';
import {
  listPracticeConsults,
  markConsultHandled,
  type ConsultRequestItem,
} from '@/src/lib/veriba-api';
import { colors, fonts, spacing, typography } from '@/src/theme';
import { formatCompactDate } from '@/src/utils/format';

/**
 * Provider Messages (mockup P-bar): the consult-request inbox (GROWTH-SPEC §1).
 * One-shot requests, not chat — providers respond by phone/email, then mark handled.
 */
export default function MessagesScreen() {
  const [consults, setConsults] = useState<ConsultRequestItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return listPracticeConsults('all')
      .then((res) => setConsults(res.consults))
      .catch(() => setConsults((prev) => prev ?? []));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  };

  const onMarkHandled = (consult: ConsultRequestItem) => {
    setConsults(
      (prev) =>
        prev?.map((c) =>
          c.id === consult.id ? { ...c, status: 'handled' as const } : c
        ) ?? null
    );
    markConsultHandled(consult.id).catch(() => void load());
  };

  const open = (consults ?? []).filter((c) => c.status === 'new');
  const handled = (consults ?? []).filter((c) => c.status !== 'new');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.heading}>Messages</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {consults !== null && consults.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.iconWrap}>
              <Ionicons name="chatbubbles-outline" size={26} color={colors.textLight} />
            </View>
            <Text style={styles.title}>No consult requests yet</Text>
            <Text style={styles.copy}>
              When members request consults from your public page or a case, they land
              here with their contact details.
            </Text>
          </View>
        ) : (
          <>
            {open.length ? <Text style={styles.sectionLabel}>NEW</Text> : null}
            {open.map((c) => (
              <ConsultCard key={c.id} consult={c} onMarkHandled={onMarkHandled} />
            ))}
            {handled.length ? <Text style={styles.sectionLabel}>HANDLED</Text> : null}
            {handled.map((c) => (
              <ConsultCard key={c.id} consult={c} />
            ))}
          </>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ConsultCard({
  consult,
  onMarkHandled,
}: {
  consult: ConsultRequestItem;
  onMarkHandled?: (consult: ConsultRequestItem) => void;
}) {
  const name = consult.member?.name ?? 'Member';
  const handledStyle = !onMarkHandled;
  return (
    <View style={[styles.card, handledStyle && { opacity: 0.62 }]}>
      <View style={styles.cardHead}>
        <AvatarBadge initials={consult.member?.initials ?? name.slice(0, 2).toUpperCase()} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{name}</Text>
          <Text style={styles.meta}>
            {formatCompactDate(consult.created_at)}
            {consult.session?.treatment ? ` · ${consult.session.treatment}` : ''}
          </Text>
        </View>
      </View>

      {consult.message ? <Text style={styles.message}>{consult.message}</Text> : null}

      <View style={styles.contactRow}>
        <Pressable
          style={styles.contactBtn}
          onPress={() => void Linking.openURL(`mailto:${consult.contact_email}`)}>
          <Ionicons name="mail-outline" size={13} color={colors.text} />
          <Text style={styles.contactText} numberOfLines={1}>
            {consult.contact_email}
          </Text>
        </Pressable>
        {consult.contact_phone ? (
          <Pressable
            style={styles.contactBtn}
            onPress={() => void Linking.openURL(`tel:${consult.contact_phone}`)}>
            <Ionicons name="call-outline" size={13} color={colors.text} />
            <Text style={styles.contactText}>{consult.contact_phone}</Text>
          </Pressable>
        ) : null}
      </View>

      {onMarkHandled ? (
        <Pressable style={styles.handleBtn} onPress={() => onMarkHandled(consult)}>
          <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
          <Text style={styles.handleText}>Mark handled</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  heading: {
    fontFamily: fonts.display.medium,
    fontSize: 24,
    color: '#23201c',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 10,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textLight,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 7,
  },
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    padding: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberName: { fontFamily: fonts.body.bold, fontSize: 13.5, color: colors.text },
  meta: { ...typography.bodyXs, color: colors.textLight, marginTop: 1 },
  message: {
    ...typography.bodySm,
    color: colors.textMid,
    lineHeight: 19,
    marginTop: 9,
  },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  contactText: { ...typography.bodyXs, color: colors.text, flexShrink: 1 },
  handleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 11,
    borderWidth: 1,
    borderColor: '#D6E8DD',
    backgroundColor: colors.successBg,
    borderRadius: 10,
    paddingVertical: 8,
  },
  handleText: { fontFamily: fonts.body.bold, fontSize: 12, color: colors.success },
  empty: { alignItems: 'center', paddingTop: 90, paddingHorizontal: spacing.xl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.display.medium, fontSize: 19, color: '#23201c' },
  copy: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
