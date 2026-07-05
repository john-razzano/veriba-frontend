// Consumer discovery data: fetches the public gallery once and caches it in
// memory for the session. Replaces the pravatar mock feed.
import { fetchPublicGallery, type PublicSessionCard } from '@/src/lib/veriba-api';
import type { FeedCase } from '@/src/data/mock-feed';

export function mapCardToFeedCase(s: PublicSessionCard): FeedCase | null {
  if (!s.before_image_url || !s.after_image_url) return null;
  return {
    id: s.id,
    treatment: s.treatment,
    clinic: s.practice.name,
    practiceId: s.practice.id,
    practiceSlug: s.practice.widget_slug ?? undefined,
    location: s.practice.location,
    category: s.category,
    beforeUri: s.before_image_url,
    afterUri: s.after_image_url,
  };
}

export interface GalleryClinic {
  practiceId?: string;
  practiceSlug?: string;
  name: string;
  location: string;
  caseCount: number;
  initials: string;
}

export interface TreatmentBucket {
  treatment: string;
  caseCount: number;
  imageUri: string;
}

const PAGE_SIZE = 48;

let cases: FeedCase[] | null = null;
let inflight: Promise<FeedCase[]> | null = null;
let moreInflight: Promise<FeedCase[] | null> | null = null;
// raw pagination cursor: counts unfiltered API rows, not mapped cases
let rawOffset = 0;
let rawTotal = Infinity;

function mapPage(sessions: Parameters<typeof mapCardToFeedCase>[0][]): FeedCase[] {
  return sessions
    // concept demo spas ("* Demo") carry generated placeholder art —
    // keep the consumer feed to real photography
    .filter((s) => !s.practice.name.endsWith(' Demo'))
    .map(mapCardToFeedCase)
    .filter((c): c is FeedCase => c !== null);
}

export function loadFeedCases(force = false): Promise<FeedCase[]> {
  if (cases && !force) return Promise.resolve(cases);
  if (inflight && !force) return inflight;
  inflight = fetchPublicGallery(PAGE_SIZE)
    .then((res) => {
      cases = mapPage(res.sessions);
      rawOffset = res.sessions.length;
      rawTotal = res.total;
      inflight = null;
      return cases;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });
  return inflight;
}

export function hasMoreFeedCases(): boolean {
  return cases !== null && rawOffset < rawTotal;
}

/** Fetch the next page and append; resolves the full list, or null if done. */
export function loadMoreFeedCases(): Promise<FeedCase[] | null> {
  if (!cases || !hasMoreFeedCases()) return Promise.resolve(null);
  if (moreInflight) return moreInflight;
  moreInflight = fetchPublicGallery(PAGE_SIZE, undefined, rawOffset)
    .then((res) => {
      const existing = new Set((cases ?? []).map((c) => c.id));
      const next = mapPage(res.sessions).filter((c) => !existing.has(c.id));
      cases = [...(cases ?? []), ...next];
      rawOffset += res.sessions.length;
      rawTotal = res.total;
      if (res.sessions.length === 0) rawTotal = rawOffset; // server exhausted
      moreInflight = null;
      return cases;
    })
    .catch((error) => {
      moreInflight = null;
      throw error;
    });
  return moreInflight;
}

/** One-off text search against the public gallery (uncached). */
export async function searchCases(query: string): Promise<FeedCase[]> {
  const res = await fetchPublicGallery(30, query);
  return res.sessions
    .filter((s) => !s.practice.name.endsWith(' Demo'))
    .map(mapCardToFeedCase)
    .filter((c): c is FeedCase => c !== null);
}

export function getCachedCases(): FeedCase[] {
  return cases ?? [];
}

export function getCachedCase(id: string): FeedCase | undefined {
  return cases?.find((c) => c.id === id);
}

export function galleryClinics(list: FeedCase[]): GalleryClinic[] {
  const byName = new Map<string, GalleryClinic>();
  for (const c of list) {
    const existing = byName.get(c.clinic);
    if (existing) {
      existing.caseCount += 1;
    } else {
      byName.set(c.clinic, {
        practiceId: c.practiceId,
        practiceSlug: c.practiceSlug,
        name: c.clinic,
        location: c.location ?? '',
        caseCount: 1,
        initials: c.clinic
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      });
    }
  }
  return [...byName.values()].sort((a, b) => b.caseCount - a.caseCount);
}

export function galleryTreatmentBuckets(list: FeedCase[]): TreatmentBucket[] {
  const byTreatment = new Map<string, TreatmentBucket>();
  for (const c of list) {
    const existing = byTreatment.get(c.treatment);
    if (existing) {
      existing.caseCount += 1;
    } else {
      byTreatment.set(c.treatment, {
        treatment: c.treatment,
        caseCount: 1,
        imageUri: c.afterUri,
      });
    }
  }
  return [...byTreatment.values()].sort((a, b) => b.caseCount - a.caseCount);
}
