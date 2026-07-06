import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';

import { colors, fonts } from '@/src/theme';

interface BeforeAfterSliderProps {
  beforeUri: string;
  afterUri: string;
  beforeBlurhash?: string;
  afterBlurhash?: string;
  height?: number;
  style?: ViewStyle;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Draggable before/after comparison for the post-detail and approval screens.
 * Uses React Native's built-in PanResponder so no native gesture dependency /
 * dev-client rebuild is required. Can be swapped for react-native-gesture-handler
 * + reanimated later for a smoother feel (see docs/REDESIGN-SPEC.md §3).
 */
export function BeforeAfterSlider({
  beforeUri,
  afterUri,
  beforeBlurhash,
  afterBlurhash,
  height = 300,
  style,
}: BeforeAfterSliderProps) {
  const [w, setW] = useState(0);
  const [ratio, setRatio] = useState(0.5);
  const widthRef = useRef(0);
  const sideRef = useRef<'before' | 'after' | null>(null);

  const updateRatio = (locationX: number) => {
    if (widthRef.current <= 0) return;
    const next = clamp(locationX / widthRef.current, 0.04, 0.96);
    const side = next < 0.5 ? 'before' : 'after';
    // Tick when the divider crosses center — but not on the initial grab.
    if (sideRef.current && sideRef.current !== side) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    sideRef.current = side;
    setRatio(next);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Never yield the drag to parent scroll views or the navigator's
      // swipe-back recognizer — rightward drags were popping the screen.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        sideRef.current = null;
        updateRatio(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => {
        updateRatio(e.nativeEvent.locationX);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    widthRef.current = next;
    setW(next);
  };

  return (
    <View style={[styles.wrap, { height }, style]} onLayout={onLayout} {...pan.panHandlers}>
      <Image
        source={{ uri: afterUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
        placeholder={afterBlurhash ? { blurhash: afterBlurhash } : undefined}
        placeholderContentFit="cover"
      />

      <View style={[styles.beforeWrap, { width: ratio * w }]}>
        {w > 0 ? (
          <>
            <Image
              source={{ uri: beforeUri }}
              style={{ width: w, height: '100%' }}
              contentFit="cover"
              transition={200}
              placeholder={beforeBlurhash ? { blurhash: beforeBlurhash } : undefined}
              placeholderContentFit="cover"
            />
            {/* mutes the "before" side — same visual language as the feed reveal */}
            <View style={styles.beforeMute} pointerEvents="none" />
          </>
        ) : null}
      </View>

      <View style={[styles.line, { left: ratio * w }]} pointerEvents="none">
        <View style={styles.knob}>
          <Ionicons name="code-outline" size={15} color={colors.teal} />
        </View>
      </View>

      <View style={[styles.lbl, styles.lblB]} pointerEvents="none">
        <Text style={styles.lblText}>BEFORE</Text>
      </View>
      <View style={[styles.lbl, styles.lblA]} pointerEvents="none">
        <Text style={styles.lblText}>AFTER</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden', width: '100%', backgroundColor: colors.bgInput },
  beforeWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  beforeMute: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(120,113,104,0.18)' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.white },
  knob: {
    position: 'absolute',
    top: '50%',
    left: -15,
    width: 32,
    height: 32,
    marginTop: -16,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  lbl: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: 'rgba(18,12,7,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  lblB: { left: 10 },
  lblA: { right: 10 },
  lblText: { fontFamily: fonts.body.bold, fontSize: 8, letterSpacing: 1, color: colors.white },
});
