import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/src/theme';

type LabelVariant = 'default' | 'small' | 'none';

interface CaseTileProps {
  afterUri: string;
  blurhash?: string;
  treatment: string;
  clinic: string;
  /** 'none' = bare image (Instagram-style small feed tiles); 'small' = compact grids */
  labelVariant?: LabelVariant;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Static, after-forward discovery tile. Used in the feed, search, and saved grids.
 * No per-tile verified badge: everything in discovery is verified by definition;
 * the post detail carries the Captured · Consented · Verified custody strip.
 */
export function CaseTile({
  afterUri,
  blurhash,
  treatment,
  clinic,
  labelVariant = 'default',
  onPress,
  style,
}: CaseTileProps) {
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onPress();
            }
          : undefined
      }
      style={({ pressed }) => [styles.tile, style, pressed && styles.pressed]}>
      <Image
        source={{ uri: afterUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
        placeholder={blurhash ? { blurhash } : undefined}
        placeholderContentFit="cover"
      />
      {labelVariant !== 'none' ? (
        <>
          <LinearGradient
            colors={['transparent', 'rgba(18,12,7,0.16)', 'rgba(18,12,7,0.82)']}
            locations={[0.4, 0.66, 1]}
            style={styles.scrim}
          />
          <View style={styles.lab}>
            <Text
              style={[styles.treatment, labelVariant === 'small' && styles.treatmentSmall]}
              numberOfLines={1}>
              {treatment}
            </Text>
            <Text
              style={[styles.clinic, labelVariant === 'small' && styles.clinicSmall]}
              numberOfLines={1}>
              {clinic}
            </Text>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.bgInput,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  lab: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 7,
  },
  treatment: {
    fontFamily: fonts.display.medium,
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  treatmentSmall: {
    fontSize: 12,
  },
  clinic: {
    fontFamily: fonts.body.semibold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.95)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  clinicSmall: {
    fontSize: 7.5,
    letterSpacing: 0.8,
  },
});
