import type { ConsentTier, SessionStatus } from '@/src/types';

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }

  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatCompactDate(iso: string | null | undefined): string {
  if (!iso) {
    return 'Draft';
  }

  const date = new Date(iso);
  const now = new Date();
  const oneDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor((now.getTime() - date.getTime()) / oneDay);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  if (diff <= 0) {
    return `Today · ${time}`;
  }

  if (diff === 1) {
    return `Yesterday · ${time}`;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }

  return String(value);
}

export function statusLabel(status: SessionStatus): string {
  switch (status) {
    case 'pending_consent':
      return 'Pending';
    case 'published':
      return 'Published';
    case 'declined':
      return 'Declined';
    case 'unpublished':
      return 'Unpublished';
    case 'draft':
      return 'Draft';
    default:
      return 'Session';
  }
}

export function consentLabel(consentTier: ConsentTier | null): string {
  switch (consentTier) {
    case 'full':
      return 'Fully Visible';
    case 'partial':
      return 'Targeted Obscuring';
    case 'full_blur':
      return 'Full Blur';
    case 'decline':
      return 'Declined';
    default:
      return 'Pending';
  }
}

export function safeInitials(value: string): string {
  return value.trim().slice(0, 5).toUpperCase() || 'PA';
}
