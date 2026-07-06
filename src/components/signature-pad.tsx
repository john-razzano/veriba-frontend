import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, radii, spacing } from '@/src/theme';

type SignaturePadProps = {
  onChange: (svg: string | null) => void;
  onReady?: (clear: () => void) => void;
  onInteractionChange?: (active: boolean) => void;
};

type Point = {
  x: number;
  y: number;
};

function pointsToPath(points: Point[]) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} l 0.01 0.01`;
  }

  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')}`;
}

export function SignaturePad({ onChange, onReady, onInteractionChange }: SignaturePadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const draft = useRef<Point[]>([]);
  const interactionRef = useRef(onInteractionChange);

  useEffect(() => {
    interactionRef.current = onInteractionChange;
  }, [onInteractionChange]);

  useEffect(() => {
    onChange(
      paths.length > 0
        ? `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">${paths
            .map((path) => `<path d="${path}" stroke="#1A1A1A" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`)
            .join('')}</svg>`
        : null
    );
  }, [onChange, paths]);

  const clear = () => {
    draft.current = [];
    setPaths([]);
  };

  useEffect(() => {
    onReady?.(clear);
  }, [onReady]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        // Never yield strokes to parent scroll views or the navigator's
        // swipe-back — same fix as the before/after slider.
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (event) => {
          interactionRef.current?.(true);
          const point = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          };

          draft.current = [point];
          setPaths((current) => [...current, pointsToPath(draft.current)]);
        },
        onPanResponderMove: (event) => {
          draft.current = [
            ...draft.current,
            {
              x: event.nativeEvent.locationX,
              y: event.nativeEvent.locationY,
            },
          ];

          setPaths((current) => {
            const next = [...current];
            next[next.length - 1] = pointsToPath(draft.current);
            return next;
          });
        },
        onPanResponderRelease: () => {
          draft.current = [];
          interactionRef.current?.(false);
        },
        onPanResponderTerminate: () => {
          draft.current = [];
          interactionRef.current?.(false);
        },
      }),
    []
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.canvas} {...panResponder.panHandlers}>
        <Svg width="100%" height="100%" viewBox="0 0 320 180">
          {paths.map((path, index) => (
            <Path
              key={`${path}-${index}`}
              d={path}
              stroke={colors.text}
              fill="none"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
        {paths.length === 0 ? <Text style={styles.placeholder}>Sign inside the canvas</Text> : null}
      </View>
      <Pressable onPress={clear} style={styles.clearButton}>
        <Text style={styles.clearText}>Clear Signature</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  canvas: {
    height: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute',
    alignSelf: 'center',
    top: '46%',
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.textLight,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    backgroundColor: colors.bgInput,
  },
  clearText: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.textMid,
  },
});
