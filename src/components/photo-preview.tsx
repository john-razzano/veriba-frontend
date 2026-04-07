import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { colors, fonts, gradients, radii, shadows, spacing, typography } from '@/src/theme';
import type { ObscureMode, ObscureRegion, PhotoObscuration } from '@/src/types';
import { clampObscureRegion, createPhotoObscuration } from '@/src/utils/obscure';

function seededIndex(seed: string, length: number) {
  const total = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return total % length;
}

function FaceIllustration({
  variant,
  seed,
}: {
  variant: 'before' | 'after';
  seed: string;
}) {
  const skinTones = ['#DEB887', '#D2A679', '#C49A6C', '#E8C5A0', '#B8875F'];
  const hairColors = ['#5A3825', '#2C1810', '#8B6F47', '#1A1A2E', '#6B3A2A'];
  const shirtColors = ['#7A9BB5', '#9B8EA0', '#8BA58B', '#B5927A', '#7A8FB5'];
  const skin = skinTones[seededIndex(seed, skinTones.length)];
  const hair = hairColors[seededIndex(`${seed}-hair`, hairColors.length)];
  const shirt = shirtColors[seededIndex(`${seed}-shirt`, shirtColors.length)];

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 250">
      <Rect x="0" y="0" width="200" height="250" fill={variant === 'before' ? '#F5F0EB' : '#EBF2EF'} />
      <Ellipse cx="100" cy="112" rx="54" ry="72" fill={skin} />
      <Path d="M46 68C54 34 146 34 154 68V108H46V68Z" fill={hair} />
      <Rect x="44" y="70" width="12" height="54" rx="6" fill={hair} />
      <Rect x="144" y="70" width="12" height="54" rx="6" fill={hair} />
      <Ellipse cx="76" cy="110" rx="8" ry="4" fill="#3D2914" />
      <Ellipse cx="124" cy="110" rx="8" ry="4" fill="#3D2914" />
      <Path d="M60 96C68 92 82 92 90 96" stroke={hair} strokeWidth="3" strokeLinecap="round" />
      <Path d="M110 96C118 92 132 92 140 96" stroke={hair} strokeWidth="3" strokeLinecap="round" />
      <Path d="M100 116L94 142C98 148 103 148 108 142" stroke="#C4A27A" strokeWidth="2" fill="none" />
      <Path d="M84 162C92 170 108 170 116 162" stroke="#C47A7A" strokeWidth="4" strokeLinecap="round" />
      {variant === 'before' ? (
        <>
          <Path d="M72 58C88 54 112 54 128 58" stroke="rgba(139,90,60,0.28)" strokeWidth="2" />
          <Path d="M70 68C88 64 112 64 130 68" stroke="rgba(139,90,60,0.24)" strokeWidth="2" />
          <Path d="M72 78C90 74 110 74 128 78" stroke="rgba(139,90,60,0.2)" strokeWidth="2" />
        </>
      ) : null}
      <Rect x="88" y="182" width="24" height="32" rx="10" fill={skin} />
      <Path d="M24 250C42 208 70 194 88 204H112C130 194 158 208 176 250H24Z" fill={shirt} />
    </Svg>
  );
}

function hexToRgba(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function buildFrame(region: ObscureRegion, width: number, height: number) {
  return {
    left: region.x * width,
    top: region.y * height,
    width: region.width * width,
    height: region.height * height,
  };
}

function resolveObscuration({
  obscuration,
  obscureMode,
  obscureRegion,
}: {
  obscuration?: PhotoObscuration | null;
  obscureMode?: ObscureMode;
  obscureRegion?: ObscureRegion | null;
}) {
  if (obscuration) {
    return obscuration;
  }

  const fallback = createPhotoObscuration(obscureMode ?? 'none');
  return {
    ...fallback,
    region: obscureRegion ?? fallback.region,
  };
}

function ObscureOverlay({
  obscuration,
  uri,
  size,
}: {
  obscuration: PhotoObscuration;
  uri?: string;
  size: { width: number; height: number };
}) {
  if (obscuration.mode === 'none' || !size.width || !size.height) {
    return null;
  }

  const frame = buildFrame(obscuration.region, size.width, size.height);

  if (obscuration.overlayType === 'blur' && uri) {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.blurFrame,
          frame,
          obscuration.mode === 'full' ? styles.roundMask : styles.rectMask,
        ]}>
        <Image
          source={{ uri }}
          blurRadius={18}
          resizeMode="cover"
          style={[
            styles.blurImage,
            {
              width: size.width,
              height: size.height,
              left: -frame.left,
              top: -frame.top,
            },
          ]}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: hexToRgba('#FFFFFF', obscuration.opacity * 0.16),
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.maskBase,
        frame,
        obscuration.mode === 'full' ? styles.roundMask : styles.rectMask,
        {
          backgroundColor: hexToRgba(obscuration.overlayColor, obscuration.opacity),
        },
      ]}
    />
  );
}

export function VerifiedBadge({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.verifiedBadge, compact && { paddingVertical: 4, paddingHorizontal: 8 }]}>
      <Text style={[styles.verifiedText, compact && { fontSize: 9 }]}>Verified Unaltered</Text>
    </View>
  );
}

export function PhotoSurface({
  uri,
  variant,
  obscuration,
  obscureMode,
  obscureRegion,
  seed,
  style,
  showLabel = true,
  onEdit,
}: {
  uri?: string;
  variant: 'before' | 'after';
  obscuration?: PhotoObscuration | null;
  obscureMode?: ObscureMode;
  obscureRegion?: ObscureRegion | null;
  seed: string;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
  onEdit?: () => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const resolved = resolveObscuration({ obscuration, obscureMode, obscureRegion });

  return (
    <View
      style={[styles.surface, style]}
      onLayout={(event) => {
        setSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        });
      }}>
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject}
          onLoadStart={() => {
            console.log('[photo.surface] load start', {
              seed,
              variant,
              uri,
            });
          }}
          onLoad={() => {
            console.log('[photo.surface] load success', {
              seed,
              variant,
              uri,
            });
          }}
          onError={(event) => {
            console.error('[photo.surface] load error', {
              seed,
              variant,
              uri,
              error: event.nativeEvent.error,
            });
          }}
        />
      ) : (
        <FaceIllustration variant={variant} seed={seed} />
      )}
      <ObscureOverlay obscuration={resolved} uri={uri} size={size} />
      {showLabel ? (
        <View style={styles.surfaceLabelWrap}>
          <Text
            style={[
              styles.surfaceLabel,
              variant === 'before' ? styles.beforeLabel : styles.afterLabel,
            ]}>
            {variant.toUpperCase()}
          </Text>
        </View>
      ) : null}
      {onEdit ? (
        <Pressable onPress={onEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={14} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function PhotoPairCard({
  beforeUri,
  afterUri,
  beforeObscuration,
  afterObscuration,
  obscureMode,
  obscureRegion,
  treatment,
  location,
  seed,
  verified,
  onEditBefore,
  onEditAfter,
}: {
  beforeUri?: string;
  afterUri?: string;
  beforeObscuration?: PhotoObscuration | null;
  afterObscuration?: PhotoObscuration | null;
  obscureMode?: ObscureMode;
  obscureRegion?: ObscureRegion | null;
  treatment?: string;
  location?: string;
  seed: string;
  verified?: boolean;
  onEditBefore?: () => void;
  onEditAfter?: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {verified ? <VerifiedBadge compact /> : <View />}
        {treatment ? <Text style={styles.metaTreatment}>{treatment}</Text> : null}
      </View>
      <View style={styles.pairRow}>
        <PhotoSurface
          uri={beforeUri}
          variant="before"
          obscuration={beforeObscuration}
          obscureMode={obscureMode}
          obscureRegion={obscureRegion}
          seed={`${seed}-before`}
          onEdit={onEditBefore}
        />
        <PhotoSurface
          uri={afterUri}
          variant="after"
          obscuration={afterObscuration}
          obscureMode={obscureMode}
          obscureRegion={obscureRegion}
          seed={`${seed}-after`}
          onEdit={onEditAfter}
        />
      </View>
      {location ? <Text style={styles.metaLocation}>{location}</Text> : null}
    </View>
  );
}

export function PhotoSlot({
  label,
  uri,
  obscuration,
  seed,
}: {
  label: string;
  uri?: string | null;
  obscuration?: PhotoObscuration | null;
  seed: string;
}) {
  return (
    <LinearGradient colors={gradients.subtle} style={styles.slotWrap}>
      <PhotoSurface
        uri={uri ?? undefined}
        variant={label === 'Before' ? 'before' : 'after'}
        obscuration={obscuration}
        seed={seed}
        style={styles.slotSurface}
      />
    </LinearGradient>
  );
}

export type ProgressionCarouselItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  uri?: string | null;
  obscuration?: PhotoObscuration | null;
  variant?: 'before' | 'after';
  badge?: string;
  pending?: boolean;
  onEdit?: () => void;
};

export function ProgressionCarouselCard({
  items,
  treatment,
  location,
  seed,
  verified,
}: {
  items: ProgressionCarouselItem[];
  treatment?: string;
  location?: string;
  seed: string;
  verified?: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {verified ? <VerifiedBadge compact /> : <View />}
        {treatment ? <Text style={styles.metaTreatment}>{treatment}</Text> : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselRow}>
        {items.map((item, index) => (
          <View key={item.id} style={[styles.carouselSlide, index === items.length - 1 && styles.carouselSlideLast]}>
            {item.pending ? (
              <View style={styles.pendingSlide}>
                <View style={styles.pendingIconWrap}>
                  <Ionicons name="send-outline" size={18} color={colors.copper} />
                </View>
                <Text style={styles.pendingTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.pendingText}>{item.subtitle}</Text> : null}
                {item.meta ? <Text style={styles.pendingMeta}>{item.meta}</Text> : null}
              </View>
            ) : (
              <PhotoSurface
                uri={item.uri ?? undefined}
                variant={item.variant ?? 'after'}
                obscuration={item.obscuration}
                seed={`${seed}-${item.id}`}
                style={styles.carouselSurface}
                showLabel={false}
                onEdit={item.onEdit}
              />
            )}

            <View style={styles.carouselMeta}>
              <View style={styles.carouselMetaHeader}>
                <Text style={styles.carouselTitle}>{item.title}</Text>
                {item.badge ? (
                  <View style={styles.carouselBadge}>
                    <Text style={styles.carouselBadgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              {item.subtitle ? <Text style={styles.carouselSubtitle}>{item.subtitle}</Text> : null}
              {item.meta ? <Text style={styles.carouselMetaText}>{item.meta}</Text> : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.carouselFooter}>
        <Text style={styles.carouselCount}>
          {items.length} {items.length === 1 ? 'slide' : 'slides'} in progression
        </Text>
        {location ? <Text style={styles.metaLocation}>{location}</Text> : null}
      </View>
    </View>
  );
}

export function PhotoOverlayEditorSurface({
  uri,
  settings,
  onChange,
  seed,
  onInteractionChange,
}: {
  uri?: string;
  settings: PhotoObscuration;
  onChange: (next: PhotoObscuration) => void;
  seed: string;
  onInteractionChange?: (active: boolean) => void;
}) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const layoutRef = useRef(layout);
  const settingsRef = useRef(settings);
  const changeRef = useRef(onChange);
  const interactionRef = useRef(onInteractionChange);
  const dragStartRef = useRef(settings.region);
  const resizeStartRef = useRef(settings.region);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    interactionRef.current = onInteractionChange;
  }, [onInteractionChange]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => settings.mode !== 'none',
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: () => settings.mode !== 'none',
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragStartRef.current = settingsRef.current.region;
          interactionRef.current?.(true);
        },
        onPanResponderMove: (_, gesture) => {
          const currentLayout = layoutRef.current;
          if (!currentLayout.width || !currentLayout.height) {
            return;
          }

          changeRef.current({
            ...settingsRef.current,
            region: clampObscureRegion({
              ...dragStartRef.current,
              x: dragStartRef.current.x + gesture.dx / currentLayout.width,
              y: dragStartRef.current.y + gesture.dy / currentLayout.height,
            }),
          });
        },
        onPanResponderRelease: () => interactionRef.current?.(false),
        onPanResponderTerminate: () => interactionRef.current?.(false),
      }),
    [settings.mode]
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => settings.mode !== 'none',
        onStartShouldSetPanResponderCapture: () => settings.mode !== 'none',
        onMoveShouldSetPanResponder: () => settings.mode !== 'none',
        onMoveShouldSetPanResponderCapture: () => settings.mode !== 'none',
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          resizeStartRef.current = settingsRef.current.region;
          interactionRef.current?.(true);
        },
        onPanResponderMove: (_, gesture) => {
          const currentLayout = layoutRef.current;
          if (!currentLayout.width || !currentLayout.height) {
            return;
          }

          changeRef.current({
            ...settingsRef.current,
            region: clampObscureRegion({
              ...resizeStartRef.current,
              width: resizeStartRef.current.width + gesture.dx / currentLayout.width,
              height: resizeStartRef.current.height + gesture.dy / currentLayout.height,
            }),
          });
        },
        onPanResponderRelease: () => interactionRef.current?.(false),
        onPanResponderTerminate: () => interactionRef.current?.(false),
      }),
    [settings.mode]
  );

  const frame = buildFrame(settings.region, layout.width, layout.height);

  return (
    <View style={styles.editorWrap}>
      <View
        style={styles.editorCanvas}
        onLayout={(event) => {
          setLayout({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          });
        }}>
        {uri ? (
          <Image source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
        ) : (
          <FaceIllustration variant="after" seed={seed} />
        )}
        <ObscureOverlay obscuration={settings} uri={uri} size={layout} />
        {settings.mode !== 'none' ? (
          <View
            style={[
              styles.editorMask,
              frame,
              settings.mode === 'full' ? styles.roundMask : styles.rectMask,
            ]}
            {...dragResponder.panHandlers}>
            <Text style={styles.editorMaskText}>Drag</Text>
            <View style={styles.resizeHandleTouchTarget} {...resizeResponder.panHandlers}>
              <View style={styles.resizeHandle} />
            </View>
          </View>
        ) : null}
      </View>
      <Text style={styles.editorHint}>
        {settings.mode === 'none'
          ? 'No obscuration is applied to this image.'
          : 'Drag to reposition the coverage area. Use the corner handle to resize it.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pairRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  carouselRow: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  carouselSlide: {
    width: 232,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgInput,
    overflow: 'hidden',
  },
  carouselSlideLast: {
    marginRight: spacing.xs,
  },
  carouselSurface: {
    height: 250,
    aspectRatio: undefined,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    borderRadius: 0,
  },
  pendingSlide: {
    height: 250,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.lg,
    margin: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    gap: spacing.sm,
  },
  pendingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  pendingText: {
    ...typography.bodySm,
    color: colors.textMid,
    textAlign: 'center',
  },
  pendingMeta: {
    ...typography.bodyXs,
    color: colors.textLight,
    textAlign: 'center',
  },
  carouselMeta: {
    padding: spacing.md,
    gap: 4,
  },
  carouselMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  carouselTitle: {
    flex: 1,
    fontFamily: fonts.body.semibold,
    fontSize: 13,
    color: colors.text,
  },
  carouselSubtitle: {
    ...typography.bodyXs,
    color: colors.textMid,
  },
  carouselMetaText: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  carouselBadge: {
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carouselBadgeText: {
    fontFamily: fonts.body.semibold,
    fontSize: 9,
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  carouselFooter: {
    gap: spacing.xs,
  },
  carouselCount: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
  surface: {
    flex: 1,
    aspectRatio: 0.78,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInput,
    position: 'relative',
  },
  maskBase: {
    position: 'absolute',
  },
  rectMask: {
    borderRadius: 10,
  },
  roundMask: {
    borderRadius: 999,
  },
  blurFrame: {
    position: 'absolute',
    overflow: 'hidden',
  },
  blurImage: {
    position: 'absolute',
  },
  surfaceLabelWrap: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  surfaceLabel: {
    fontFamily: fonts.body.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  beforeLabel: {
    color: colors.copper,
  },
  afterLabel: {
    color: colors.success,
  },
  editButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    backgroundColor: colors.success,
    borderRadius: radii.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  verifiedText: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaTreatment: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: colors.text,
  },
  metaLocation: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.textLight,
  },
  slotWrap: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.xs,
    minHeight: 0,
  },
  slotSurface: {
    flex: 1,
    height: '100%',
    aspectRatio: undefined,
  },
  editorWrap: {
    gap: spacing.sm,
  },
  editorCanvas: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInput,
    position: 'relative',
  },
  editorMask: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: spacing.sm,
    backgroundColor: 'transparent',
  },
  editorMaskText: {
    alignSelf: 'flex-start',
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    color: colors.white,
    backgroundColor: 'rgba(23,23,23,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  resizeHandle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.copper,
  },
  resizeHandleTouchTarget: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.xs,
    marginBottom: -spacing.xs,
  },
  editorHint: {
    ...typography.bodyXs,
    color: colors.textLight,
  },
});
