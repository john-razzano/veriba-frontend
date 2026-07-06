export type ObscureMode = 'none' | 'eyes' | 'upper' | 'full';

export type ConsentTier = 'full' | 'partial' | 'full_blur' | 'decline';
export type OverlayType = 'mask' | 'blur';

export type SessionStatus =
  | 'draft'
  | 'pending_after'
  | 'pending_consent'
  | 'ready_to_publish'
  | 'published'
  | 'declined'
  | 'unpublished';

export type TreatmentCategory =
  | 'Botox'
  | 'Fillers'
  | 'Skin'
  | 'Hair'
  | 'Body'
  | 'Other';

export type AuthProvider = 'google' | 'apple' | 'email';

export type PublishDestination = 'widget' | 'gallery' | 'gbp';
export type ProgressPhotoKind = 'baseline' | 'after';
export type PhotoSubmittedBy = 'provider' | 'patient';
export type FollowUpMethod = 'patient_link' | 'follow_up_visit' | 'not_needed';
export type FollowUpTiming = '3_days' | '1_week' | '2_weeks' | '1_month';
export type FollowUpRequestStatus =
  | 'not_scheduled'
  | 'scheduled'
  | 'sent'
  | 'opened'
  | 'completed'
  | 'expired'
  | 'cancelled';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ObscureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoObscuration {
  mode: ObscureMode;
  region: ObscureRegion;
  overlayType: OverlayType;
  overlayColor: string;
  opacity: number;
}

export interface Practice {
  id: string;
  name: string;
  location: string;
  coordinates: Coordinates | null;
  website: string;
  widgetSlug: string;
  servicesOffered: string[];
  defaultDiscounts: {
    full: number;
    partial: number;
    fullBlur: number;
  };
  creditExpirationDays: number;
  autoPublish: boolean;
  ownerId: string;
  bio: string;
  avatarUrl: string | null;
  bookingUrl: string;
  featuredSessionId: string | null;
  hours: Record<string, string | null> | null;
  followersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeStats {
  totalPublished: number;
  totalPending: number;
  totalDeclined: number;
  profileViewsTotal: number;
  profileViewsThisWeek: number;
  seoImpressionsTotal: number;
  seoImpressionsThisWeek: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  practiceId: string | null;
  role: string;
  authProvider: AuthProvider;
  createdAt: string;
}

export interface SEOData {
  title: string;
  altText: string;
  metaDescription: string;
  filename: string;
  urlSlug: string;
  url: string;
}

export interface FollowUpRequest {
  id?: string | null;
  method: FollowUpMethod;
  timing: FollowUpTiming;
  sendImmediately: boolean;
  status: FollowUpRequestStatus;
  scheduledFor: string | null;
  sentAt: string | null;
  openedAt: string | null;
  respondedAt: string | null;
  patientDestination: string;
  patientEmail: string;
  patientFirstName: string;
  message: string;
  uploadUrl: string | null;
  uploadToken: string | null;
  expiresAt: string | null;
}

export interface CapturedPhoto {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  capturedAt: string;
  hash: string;
  coordinates: Coordinates | null;
  source: 'camera' | 'library' | 'remote';
  uploaded?: boolean;
}

export interface ProgressPhoto extends CapturedPhoto {
  id: string;
  kind: ProgressPhotoKind;
  label: string;
  submittedBy: PhotoSubmittedBy;
  obscuration?: PhotoObscuration | null;
}

export interface CustodyCheckpoint {
  id: string;
  icon: string;
  label: string;
  detail: string;
  timestamp: string;
  hash: string | null;
  verified: boolean;
}

export interface ChainOfCustody {
  sessionId: string;
  checkpoints: CustodyCheckpoint[];
  allVerified: boolean;
}

export interface Session {
  id: string;
  practiceId: string;
  patientInitials: string;
  treatment: string;
  category: TreatmentCategory;
  status: SessionStatus;
  photos: ProgressPhoto[];
  followUpRequest: FollowUpRequest | null;
  beforePhotoUri: string | null;
  afterPhotoUri: string | null;
  obscureMode: ObscureMode;
  obscureRegion: ObscureRegion | null;
  beforeObscuration: PhotoObscuration;
  afterObscuration: PhotoObscuration;
  capturedAt: string | null;
  captureHash: string | null;
  captureCoordinates: Coordinates | null;
  signedAt: string | null;
  signHash: string | null;
  consentTier: ConsentTier | null;
  consentSignatureSvg: string | null;
  consentSignatureUrl: string | null;
  consentAt: string | null;
  discountApplied: number | null;
  publishedAt: string | null;
  publishHash: string | null;
  publishedDestinations: PublishDestination[];
  seo: SEOData | null;
  pageViews: number;
  savesCount: number;
  chainOfCustody: ChainOfCustody | null;
  createdAt: string;
  updatedAt: string;
}

export interface WizardState {
  sessionId: string | null;
  step: number;
  treatment: string | null;
  category: TreatmentCategory | null;
  beforePhoto: CapturedPhoto | null;
  afterPhoto: CapturedPhoto | null;
  progressPhotos: ProgressPhoto[];
  patientInitials: string;
  obscureMode: ObscureMode;
  obscureRegion: ObscureRegion;
  beforeObscuration: PhotoObscuration;
  afterObscuration: PhotoObscuration;
  consentTier: ConsentTier | null;
  signatureSvg: string | null;
  signed: boolean;
  consentRecordedAt: string | null;
  followUpRequest: FollowUpRequest;
  publishDestinations: PublishDestination[];
}

export interface TreatmentOption {
  label: string;
  category: TreatmentCategory;
}

export const TREATMENTS: TreatmentOption[] = [
  { label: 'Botox – Forehead', category: 'Botox' },
  { label: "Botox – Crow's Feet", category: 'Botox' },
  { label: 'Botox – Glabella', category: 'Botox' },
  { label: 'Dermal Filler – Lips', category: 'Fillers' },
  { label: 'Dermal Filler – Cheeks', category: 'Fillers' },
  { label: 'Dermal Filler – Jawline', category: 'Fillers' },
  { label: 'Chemical Peel', category: 'Skin' },
  { label: 'Microneedling', category: 'Skin' },
  { label: 'Laser Resurfacing', category: 'Skin' },
  { label: 'Hair Restoration – PRP', category: 'Hair' },
  { label: 'Kybella – Double Chin', category: 'Body' },
  { label: 'CoolSculpting', category: 'Body' },
  { label: 'IPL Photofacial', category: 'Skin' },
  { label: 'Hydrafacial', category: 'Skin' },
  { label: 'Thread Lift', category: 'Skin' },
];

export const DEFAULT_SERVICES_OFFERED = [
  'Botox – Forehead',
  "Botox – Crow's Feet",
  'Dermal Filler – Lips',
  'Dermal Filler – Cheeks',
  'Chemical Peel',
  'Microneedling',
  'Hair Restoration – PRP',
  'IPL Photofacial',
] as const;

export function normalizeServicesOffered(services: string[]) {
  const enabled = new Set(services);
  return TREATMENTS.filter((option) => enabled.has(option.label)).map((option) => option.label);
}

export const OBSCURE_OPTIONS: {
  id: ObscureMode;
  label: string;
  description: string;
  icon: string;
}[] = [
  { id: 'none', label: 'No Obscuring', description: 'Image is fully visible', icon: '○' },
  { id: 'eyes', label: 'Band Obscuring', description: 'Targeted narrow mask', icon: '◑' },
  { id: 'upper', label: 'Upper Area', description: 'Larger top-area mask', icon: '◒' },
  { id: 'full', label: 'Full Blur', description: 'Entire area is obscured', icon: '●' },
];

export const CONSENT_TIERS: {
  id: ConsentTier;
  label: string;
  discount: string;
  discountAmount: number;
  obscureMode: ObscureMode | null;
}[] = [
  {
    id: 'full',
    label: 'Fully Visible — No Obscuring',
    discount: '$150 off next visit',
    discountAmount: 150,
    obscureMode: 'none',
  },
  {
    id: 'partial',
    label: 'Targeted Obscuring',
    discount: '$75 off next visit',
    discountAmount: 75,
    obscureMode: 'eyes',
  },
  {
    id: 'full_blur',
    label: 'Full Blur',
    discount: '$25 off next visit',
    discountAmount: 25,
    obscureMode: 'full',
  },
  {
    id: 'decline',
    label: 'Do Not Publish',
    discount: 'No reward',
    discountAmount: 0,
    obscureMode: 'full',
  },
];

export const FILTER_CATEGORIES = ['All', 'Botox', 'Fillers', 'Skin', 'Hair', 'Body'] as const;

export const FOLLOW_UP_METHODS: {
  id: FollowUpMethod;
  label: string;
  description: string;
}[] = [
  {
    id: 'patient_link',
    label: 'Patient Selfie Link',
    description: 'Schedule a secure upload link for the patient after treatment.',
  },
  {
    id: 'follow_up_visit',
    label: 'Future Follow-up Visit',
    description: 'Track the session as pending and capture the after photo in clinic later.',
  },
  {
    id: 'not_needed',
    label: 'No Follow-up Scheduled',
    description: 'Save the entry without planning the next capture yet.',
  },
];

export const FOLLOW_UP_TIMINGS: {
  id: FollowUpTiming;
  label: string;
  description: string;
}[] = [
  { id: '3_days', label: '3 Days', description: 'Early swelling or healing check.' },
  { id: '1_week', label: '1 Week', description: 'Typical short-term follow-up window.' },
  { id: '2_weeks', label: '2 Weeks', description: 'Recommended for injectables like Botox.' },
  { id: '1_month', label: '1 Month', description: 'Longer outcome window for surgical recovery.' },
];
