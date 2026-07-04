// Shared consumer-feed types plus the few remaining text-only mocks.
// Imagery comes from the live public gallery (src/lib/gallery.ts) — the
// pravatar placeholder feed is gone.

export interface FeedCase {
  id: string;
  treatment: string;
  clinic: string;
  beforeUri: string;
  afterUri: string;
  practiceId?: string;
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

// --- Consumer Inbox (mockup C3) — approvals/activity API doesn't exist yet ---

export interface InboxActivity {
  id: string;
  icon: 'eye' | 'heart' | 'chat';
  text: string;
  timeAgo: string;
}

export const MOCK_INBOX_ACTIVITY: InboxActivity[] = [
  { id: 'a1', icon: 'eye', text: 'Your microneedling result was viewed 42 times this week', timeAgo: '2 days ago' },
  { id: 'a2', icon: 'heart', text: 'Clinica Vera saved your result to their portfolio', timeAgo: '4 days ago' },
  { id: 'a3', icon: 'chat', text: 'Halo Med replied to your consult request', timeAgo: '1 week ago' },
];
