import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '@/src/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  title: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    color: colors.text,
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: 15,
  },
  linkText: {
    ...typography.bodyMd,
    color: colors.copper,
  },
});
