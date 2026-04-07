import type {
  ConsentTier,
  FollowUpMethod,
  FollowUpRequestStatus,
  FollowUpTiming,
  SessionStatus,
} from '@/src/types';

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
    case 'pending_after':
      return 'Pending After Photo';
    case 'pending_consent':
      return 'Pending Consent';
    case 'ready_to_publish':
      return 'Ready to Publish';
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

export function followUpMethodLabel(method: FollowUpMethod): string {
  switch (method) {
    case 'patient_link':
      return 'Patient Selfie Link';
    case 'follow_up_visit':
      return 'Future Follow-up Visit';
    case 'not_needed':
      return 'No Follow-up Scheduled';
    default:
      return 'Follow-up';
  }
}

export function followUpTimingLabel(timing: FollowUpTiming): string {
  switch (timing) {
    case '3_days':
      return '3 Days';
    case '1_week':
      return '1 Week';
    case '2_weeks':
      return '2 Weeks';
    case '1_month':
      return '1 Month';
    default:
      return 'Later';
  }
}

export function followUpStatusLabel(status: FollowUpRequestStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'sent':
      return 'Link Sent';
    case 'opened':
      return 'Opened';
    case 'completed':
      return 'Completed';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    case 'not_scheduled':
      return 'Not Scheduled';
    default:
      return 'Pending';
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
