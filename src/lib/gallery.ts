// Consumer discovery data: fetches the public gallery once and caches it in
// memory for the session. Replaces the pravatar mock feed.
import { fetchPublicGallery } from '@/src/lib/veriba-api';
import type { FeedCase } from '@/src/data/mock-feed';

export interface GalleryClinic {
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

let cases: FeedCase[] | null = null;
let inflight: Promise<FeedCase[]> | null = null;

export function loadFeedCases(force = false): Promise<FeedCase[]> {
  if (cases && !force) return Promise.resolve(cases);
  if (inflight && !force) return inflight;
  inflight = fetchPublicGallery(48)
    .then((res) => {
      cases = res.sessions
        // concept demo spas ("* Demo") carry generated placeholder art —
        // keep the consumer feed to real photography
        .filter((s) => !s.practice.name.endsWith(' Demo'))
        .filter((s) => s.before_image_url && s.after_image_url)
        .map((s) => ({
          id: s.id,
          treatment: s.treatment,
          clinic: s.practice.name,
          location: s.practice.location,
          category: s.category,
          beforeUri: s.before_image_url as string,
          afterUri: s.after_image_url as string,
        }));
      inflight = null;
      return cases;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });
  return inflight;
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
