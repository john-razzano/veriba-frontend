// Member interaction state: saves, follows, pending approvals. Thin in-memory
// cache over /api/me/* with optimistic toggles.
import type { FeedCase } from '@/src/data/mock-feed';
import { mapCardToFeedCase } from '@/src/lib/gallery';
import {
  followPractice,
  listApprovals,
  listFollows,
  listSaves,
  saveCase,
  unfollowPractice,
  unsaveCase,
  type ApprovalItem,
  type PublicPracticeCard,
} from '@/src/lib/veriba-api';

let savedIds: Set<string> | null = null;
let followedIds: Set<string> | null = null;
let approvals: ApprovalItem[] | null = null;

export async function ensureMemberState(): Promise<void> {
  if (savedIds && followedIds) return;
  const [saves, follows] = await Promise.all([listSaves(), listFollows()]);
  savedIds = new Set(saves.sessions.map((s) => s.id));
  followedIds = new Set(follows.practices.map((p) => p.id));
}

export function isSaved(sessionId: string): boolean {
  return savedIds?.has(sessionId) ?? false;
}

export function isFollowed(practiceId: string): boolean {
  return followedIds?.has(practiceId) ?? false;
}

/** Optimistic toggle; returns the new saved state. Rolls back on failure. */
export async function toggleSave(sessionId: string): Promise<boolean> {
  savedIds = savedIds ?? new Set();
  if (savedIds.has(sessionId)) {
    savedIds.delete(sessionId);
    try {
      await unsaveCase(sessionId);
    } catch (error) {
      savedIds.add(sessionId);
      throw error;
    }
    return false;
  }
  savedIds.add(sessionId);
  try {
    await saveCase(sessionId);
  } catch (error) {
    savedIds.delete(sessionId);
    throw error;
  }
  return true;
}

export async function toggleFollow(practiceId: string): Promise<boolean> {
  followedIds = followedIds ?? new Set();
  if (followedIds.has(practiceId)) {
    followedIds.delete(practiceId);
    try {
      await unfollowPractice(practiceId);
    } catch (error) {
      followedIds.add(practiceId);
      throw error;
    }
    return false;
  }
  followedIds.add(practiceId);
  try {
    await followPractice(practiceId);
  } catch (error) {
    followedIds.delete(practiceId);
    throw error;
  }
  return true;
}

export async function loadSavedCases(): Promise<FeedCase[]> {
  const res = await listSaves();
  savedIds = new Set(res.sessions.map((s) => s.id));
  return res.sessions
    .map(mapCardToFeedCase)
    .filter((c): c is FeedCase => c !== null);
}

export async function loadFollowedClinics(): Promise<PublicPracticeCard[]> {
  const res = await listFollows();
  followedIds = new Set(res.practices.map((p) => p.id));
  return res.practices;
}

export async function loadApprovals(force = false): Promise<ApprovalItem[]> {
  if (approvals && !force) return approvals;
  const res = await listApprovals();
  approvals = res.approvals;
  return approvals;
}

export function getApproval(id: string): ApprovalItem | undefined {
  return approvals?.find((a) => a.id === id);
}

export function invalidateApprovals(): void {
  approvals = null;
}

/** Clear all member caches (call on logout/login). */
export function resetMemberState(): void {
  savedIds = null;
  followedIds = null;
  approvals = null;
}
