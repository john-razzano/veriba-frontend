// Shared consumer-feed types. All data comes from the live public gallery
// (src/lib/gallery.ts) — no mock or placeholder content remains.

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
