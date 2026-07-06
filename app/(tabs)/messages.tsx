import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
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

/** "Jul 6 · 7:04 AM" — consult history needs the time of day, not just the date. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${formatCompactDate(iso)} · ${d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

/** mailto:/tel: fail on devices without a handler (e.g. no Mail account) — fall back to copying. */
function openContact(url: string, value: string, label: string) {
  Linking.openURL(url).catch(() => {
    void Clipboard.setStringAsync(value).then(() =>
      Alert.alert('Copied', `${label} copied to the clipboard.`)
    );
  });
}

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
  const [expanded, setExpanded] = useState(false);
  const name = consult.member?.name ?? 'Member';
  const handled = consult.status === 'handled';
  return (
    <Pressable
      style={[styles.card, handled && !expanded && { opacity: 0.62 }]}
      onPress={() => setExpanded((prev) => !prev)}>
      <View style={styles.cardHead}>
        <AvatarBadge initials={consult.member?.initials ?? name.slice(0, 2).toUpperCase()} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{name}</Text>
          <Text style={styles.meta}>
            {formatCompactDate(consult.created_at)}
            {consult.session?.treatment ? ` · ${consult.session.treatment}` : ''}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textLight}
        />
      </View>

      {consult.message ? <Text style={styles.message}>{consult.message}</Text> : null}

      <View style={styles.contactRow}>
        <Pressable
          style={styles.contactBtn}
          onPress={() =>
            openContact(`mailto:${consult.contact_email}`, consult.contact_email, 'Email')
          }>
          <Ionicons name="mail-outline" size={13} color={colors.text} />
          <Text style={styles.contactText} numberOfLines={1}>
            {consult.contact_email}
          </Text>
        </Pressable>
        {consult.contact_phone ? (
          <Pressable
            style={styles.contactBtn}
            onPress={() =>
              openContact(`tel:${consult.contact_phone}`, consult.contact_phone!, 'Phone number')
            }>
            <Ionicons name="call-outline" size={13} color={colors.text} />
            <Text style={styles.contactText}>{consult.contact_phone}</Text>
          </Pressable>
        ) : null}
      </View>

      {expanded ? (
        <View style={styles.history}>
          <View style={styles.historyRow}>
            <Ionicons name="arrow-down-circle-outline" size={13} color={colors.textLight} />
            <Text style={styles.historyText}>Received {formatWhen(consult.created_at)}</Text>
          </View>
          {handled && consult.handled_at ? (
            <View style={styles.historyRow}>
              <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
              <Text style={styles.historyText}>
                Marked handled {formatWhen(consult.handled_at)}
              </Text>
            </View>
          ) : null}
          {consult.session?.treatment ? (
            <View style={styles.historyRow}>
              <Ionicons name="image-outline" size={13} color={colors.textLight} />
              <Text style={styles.historyText}>
                Asked from the {consult.session.treatment} case
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {onMarkHandled ? (
        <Pressable style={styles.handleBtn} onPress={() => onMarkHandled(consult)}>
          <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
          <Text style={styles.handleText}>Mark handled</Text>
        </Pressable>
      ) : null}
    </Pressable>
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
  history: {
    marginTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 9,
    gap: 6,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyText: { ...typography.bodyXs, color: colors.textMid },
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
