export type ObscureMode = 'none' | 'eyes' | 'upper' | 'full';

export type ConsentTier = 'full' | 'partial' | 'full_blur' | 'decline';
export type OverlayType = 'mask' | 'blur';

export type SessionStatus =
  | 'draft'
  | 'pending_consent'
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
  coordinates: Coordinates;
  website: string;
  widgetSlug: string;
  servicesOffered: string[];
  defaultDiscounts: {
    full: number;
    partial: number;
    fullBlur: number;
  };
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  practiceId: string;
  authProvider: AuthProvider;
  createdAt: string;
}

export interface SEOData {
  title: string;
  altText: string;
  metaDescription: string;
  url: string;
  filename: string;
}

export interface Session {
  id: string;
  practiceId: string;
  patientInitials: string;
  treatment: string;
  category: TreatmentCategory;
  status: SessionStatus;
  beforePhotoUri: string;
  afterPhotoUri: string;
  obscureMode: ObscureMode;
  obscureRegion?: ObscureRegion | null;
  beforeObscuration?: PhotoObscuration | null;
  afterObscuration?: PhotoObscuration | null;
  capturedAt: string;
  captureHash: string;
  captureCoordinates: Coordinates;
  signedAt: string;
  signHash: string;
  consentTier: ConsentTier | null;
  consentSignatureSvg: string | null;
  consentAt: string | null;
  discountApplied: number | null;
  publishedAt: string | null;
  publishHash: string | null;
  publishedDestinations: PublishDestination[];
  seo: SEOData;
  pageViews: number;
  createdAt: string;
  updatedAt: string;
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

export interface CapturedPhoto {
  uri: string;
  capturedAt: string;
  hash: string;
  coordinates: Coordinates;
  source: 'camera' | 'library';
}

export interface WizardState {
  step: number;
  treatment: string | null;
  category: TreatmentCategory | null;
  beforePhoto: CapturedPhoto | null;
  afterPhoto: CapturedPhoto | null;
  patientInitials: string;
  obscureMode: ObscureMode;
  obscureRegion: ObscureRegion;
  beforeObscuration: PhotoObscuration;
  afterObscuration: PhotoObscuration;
  consentTier: ConsentTier | null;
  signatureSvg: string | null;
  signed: boolean;
  consentRecordedAt: string | null;
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
];

export const FILTER_CATEGORIES = ['All', 'Botox', 'Fillers', 'Skin', 'Hair', 'Body'] as const;
