import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '@/src/theme';

interface AutoRevealTileProps {
  beforeUri: string;
  afterUri: string;
  beforeBlurhash?: string;
  afterBlurhash?: string;
  treatment: string;
  clinic: string;
  /** stagger so multiple tiles don't sweep in unison (ms) */
  delay?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Discovery-feed hero tile that auto-animates a before -> after wipe on a loop.
 * No gesture library required — pure reanimated timeline. The deliberate
 * drag comparison lives in <BeforeAfterSlider /> on the post + approval screens.
 */
export function AutoRevealTile({
  beforeUri,
  afterUri,
  beforeBlurhash,
  afterBlurhash,
  treatment,
  clinic,
  delay = 0,
  onPress,
  style,
}: AutoRevealTileProps) {
  const [w, setW] = useState(0);
  // progress: 1 = fully showing "before", 0 = fully showing "after"
  const progress = useSharedValue(1);

  useEffect(() => {
    if (w <= 0) return;
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 840 }),
          withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 840 }),
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [w, delay, progress]);

  const beforeStyle = useAnimatedStyle(() => ({ width: progress.value * w }));
  const lineStyle = useAnimatedStyle(() => ({ left: progress.value * w }));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, style, pressed && styles.pressed]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Image
        source={{ uri: afterUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
        placeholder={afterBlurhash ? { blurhash: afterBlurhash } : undefined}
        placeholderContentFit="cover"
      />

      <Animated.View style={[styles.beforeWrap, beforeStyle]}>
        {w > 0 ? (
          <>
            <Image
              source={{ uri: beforeUri }}
              style={{ width: w, height: '100%' }}
              contentFit="cover"
              transition={200}
            />
            {/* mutes the "before" so the reveal lands on a vivid after */}
            <View style={styles.beforeMute} pointerEvents="none" />
          </>
        ) : null}
      </Animated.View>

      <Animated.View style={[styles.line, lineStyle]} pointerEvents="none">
        <View style={styles.knob} />
      </Animated.View>

      <LinearGradient
        colors={['transparent', 'rgba(18,12,7,0.16)', 'rgba(18,12,7,0.82)']}
        locations={[0.4, 0.66, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.tag}>
        <View style={styles.dot} />
        <Text style={styles.tagText}>BEFORE → AFTER</Text>
      </View>

      <View style={styles.lab}>
        <Text style={styles.treatment} numberOfLines={1}>
          {treatment}
        </Text>
        <Text style={styles.clinic} numberOfLines={1}>
          {clinic}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: colors.bgInput },
  beforeWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  beforeMute: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(120,113,104,0.22)' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.92)' },
  knob: {
    position: 'absolute',
    top: '50%',
    left: -10,
    width: 22,
    height: 22,
    marginTop: -11,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  tag: {
    position: 'absolute',
    top: 7,
    left: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(18,12,7,0.5)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.white },
  tagText: { fontFamily: fonts.body.bold, fontSize: 7.5, letterSpacing: 1, color: colors.white },
  lab: { position: 'absolute', left: 8, right: 8, bottom: 7 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  treatment: {
    fontFamily: fonts.display.medium,
    fontStyle: 'italic',
    fontSize: 17,
    letterSpacing: 0.2,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
});
