// Shared consumer-feed types plus the few remaining text-only mocks.
// Imagery comes from the live public gallery (src/lib/gallery.ts) — the
// pravatar placeholder feed is gone.

export interface FeedCase {
  id: string;
  treatment: string;
  clinic: string;
  beforeUri: string;
  afterUri: string;
  beforeBlurhash?: string;
  afterBlurhash?: string;
  practiceId?: string;
  practiceSlug?: string;
  location?: string;
  category?: string;
}

export const TRENDING_TREATMENTS = [
  'Lip filler',
  'Botox',
  'Laser resurfacing',
  'Microneedling',
  'PRP',
];

