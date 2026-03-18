import type { ObscureMode, ObscureRegion, OverlayType, PhotoObscuration } from '@/src/types';

const DEFAULT_REGIONS: Record<ObscureMode, ObscureRegion> = {
  none: { x: 0.24, y: 0.35, width: 0.52, height: 0.1 },
  eyes: { x: 0.24, y: 0.35, width: 0.52, height: 0.1 },
  upper: { x: 0.18, y: 0.18, width: 0.62, height: 0.28 },
  full: { x: 0.2, y: 0.12, width: 0.6, height: 0.58 },
};

export const OVERLAY_COLOR_PRESETS = ['#171717', '#2D4F5E', '#7A4E2D', '#5A5650'] as const;
export const OVERLAY_OPACITY_PRESETS = [0.4, 0.6, 0.8] as const;
export const OVERLAY_TYPE_OPTIONS: { id: OverlayType; label: string }[] = [
  { id: 'blur', label: 'Blur' },
  { id: 'mask', label: 'Mask' },
];

export function getDefaultObscureRegion(mode: ObscureMode): ObscureRegion {
  return { ...DEFAULT_REGIONS[mode] };
}

export function createPhotoObscuration(mode: ObscureMode): PhotoObscuration {
  return {
    mode,
    region: getDefaultObscureRegion(mode),
    overlayType: mode === 'none' ? 'mask' : 'blur',
    overlayColor: '#171717',
    opacity: mode === 'none' ? 0 : mode === 'full' ? 0.72 : 0.8,
  };
}

export function syncPhotoObscuration(
  obscuration: PhotoObscuration,
  updates: Partial<PhotoObscuration>
) {
  const next = {
    ...obscuration,
    ...updates,
  };

  return {
    ...next,
    region: clampObscureRegion(next.region),
    opacity: clamp(next.opacity, 0.15, 1),
  };
}

export function clampObscureRegion(region: ObscureRegion): ObscureRegion {
  const width = clamp(region.width, 0.18, 0.88);
  const height = clamp(region.height, 0.08, 0.88);

  return {
    width,
    height,
    x: clamp(region.x, 0, 1 - width),
    y: clamp(region.y, 0, 1 - height),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
