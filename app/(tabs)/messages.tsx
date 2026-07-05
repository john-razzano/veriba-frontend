import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing, typography } from '@/src/theme';

/**
 * Provider Messages (mockup P-bar). Consult-request messaging isn't built yet
 * (public page "Book consult" currently opens the clinic's booking link), so
 * this is an honest empty state, not fake threads.
 */
export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.heading}>Messages</Text>
      <View style={styles.empty}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubbles-outline" size={26} color={colors.textLight} />
        </View>
        <Text style={styles.title}>No messages yet</Text>
        <Text style={styles.copy}>
          When members request consults through your public page, the conversations
          will land here.
        </Text>
      </View>
    </SafeAreaView>
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
