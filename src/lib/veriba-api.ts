import { Platform } from 'react-native';

import { createPhotoObscuration } from '@/src/utils/obscure';
import {
  DEFAULT_SERVICES_OFFERED,
  type AuthProvider,
  type CapturedPhoto,
  type ChainOfCustody,
  type ConsentTier,
  type Coordinates,
  type CustodyCheckpoint,
  type FollowUpRequest,
  type FollowUpRequestStatus,
  type ObscureMode,
  type Practice,
  type PracticeStats,
  type ProgressPhoto,
  type PublishDestination,
  type SEOData,
  type Session,
  type SessionStatus,
  type TreatmentCategory,
  type User,
} from '@/src/types';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_VERIBA_API_BASE_URL ??
  process.env.NEXT_PUBLIC_VERIBA_API_BASE_URL ??
  process.env.VITE_VERIBA_API_BASE_URL ??
  '';
const REQUEST_TIMEOUT_MS = 15000;

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: {
    code?: string | null;
    message?: string | null;
    details?: unknown;
  } | null;
};

type TokenState = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
};

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  auth?: boolean;
  body?: BodyInit | Record<string, unknown> | null;
  headers?: Record<string, string>;
  retryOnUnauthorized?: boolean;
};

type RawRecord = Record<string, unknown>;

export type AuthUserResponse = {
  id: string;
  email: string;
  name: string;
  initials: string;
  practice_id: string | null;
  role?: string | null;
  created_at: string;
};

export type PracticeResponse = {
  id: string;
  name: string;
  location: string;
  coordinates?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
  lat?: number | null;
  lng?: number | null;
  website?: string | null;
  widget_slug?: string | null;
  default_discounts?: {
    full?: number | null;
    partial?: number | null;
    full_blur?: number | null;
  } | null;
  credit_expiration_days?: number | null;
  auto_publish?: boolean | null;
  owner_id?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_blurhash?: string | null;
  booking_url?: string | null;
  services?: string[] | null;
  featured_session_id?: string | null;
  hours?: Record<string, string | null> | null;
  followers_count?: number;
  created_at: string;
  updated_at: string;
};

export type PracticeStatsResponse = {
  total_published: number;
  total_pending: number;
  total_declined: number;
  profile_views_total: number;
  profile_views_this_week: number;
  seo_impressions_total: number;
  seo_impressions_this_week: number;
};

export type SessionSummaryResponse = {
  id: string;
  patient_initials: string;
  treatment: string;
  category: TreatmentCategory;
  status: SessionStatus;
  obscure_mode?: ObscureMode | null;
  consent_tier?: ConsentTier | null;
  before_image_url?: string | null;
  after_image_url?: string | null;
  page_views?: number | null;
  saves_count?: number | null;
  captured_at?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionDetailResponse = SessionSummaryResponse & {
  chain_of_custody?: {
    all_verified?: boolean | null;
    checkpoints?: Array<{
      id?: string | null;
      icon?: string | null;
      label?: string | null;
      detail?: string | null;
      timestamp?: string | null;
      hash?: string | null;
      verified?: boolean | null;
    }> | null;
  } | null;
  consent_signature_url?: string | null;
  consent_at?: string | null;
  discount_applied?: number | null;
  publish_hash?: string | null;
  seo?: {
    title?: string | null;
    alt_text?: string | null;
    meta_description?: string | null;
    filename?: string | null;
    url_slug?: string | null;
  } | null;
  photos?: SessionPhoto[] | null;
};

export type SessionListResponse = {
  sessions: SessionSummaryResponse[];
  total: number;
  limit: number;
  offset: number;
};

export type SessionResponseWithStatus = {
  status?: SessionStatus | null;
  published_at?: string | null;
  publish_hash?: string | null;
  seo?: SessionDetailResponse['seo'];
  destinations?: PublishDestination[] | null;
};

export type MemberMatch = {
  id: string;
  name?: string | null;
  initials?: string | null;
};

export type FollowUpResponse = {
  id?: string | null;
  status?: FollowUpRequestStatus | string | null;
  upload_token?: string | null;
  upload_url?: string | null;
  patient_email?: string | null;
  patient_first_name?: string | null;
  patient_user_id?: string | null;
  member_match?: MemberMatch | null;
  send_at?: string | null;
  sent_at?: string | null;
  opened_at?: string | null;
  uploaded_at?: string | null;
  expires_at?: string | null;
  message?: string | null;
};

let getTokenState: () => TokenState = () => ({
  accessToken: null,
  refreshToken: null,
  tokenType: 'bearer',
});

let onTokensUpdated: (tokens: TokenState) => void = () => {};
let onUnauthorized: () => void = () => {};
let refreshPromise: Promise<TokenState | null> | null = null;

export class VeribaApiError extends Error {
  code: string | null;
  details: unknown;
  status: number;

  constructor(message: string, options?: { code?: string | null; details?: unknown; status?: number }) {
    super(message);
    this.name = 'VeribaApiError';
    this.code = options?.code ?? null;
    this.details = options?.details ?? null;
    this.status = options?.status ?? 0;
  }
}

export function configureVeribaApiAuth(config: {
  getTokenState: () => TokenState;
  onTokensUpdated: (tokens: TokenState) => void;
  onUnauthorized: () => void;
}) {
  getTokenState = config.getTokenState;
  onTokensUpdated = config.onTokensUpdated;
  onUnauthorized = config.onUnauthorized;
}

export function apiUrl(path: string) {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

function getApiOrigin() {
  if (!API_BASE_URL) {
    return null;
  }

  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return null;
  }
}

function normalizeBackendAssetUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const apiOrigin = getApiOrigin();

  if (!apiOrigin) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const normalized = `${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;

      console.log('[api.normalizeAssetUrl]', {
        original: url,
        normalized,
      });

      return normalized;
    }

    return url;
  } catch {
    if (url.startsWith('/')) {
      return `${apiOrigin}${url}`;
    }

    return url;
  }
}

function getNetworkHint() {
  if (Platform.OS !== 'web' && /localhost|127\.0\.0\.1/.test(API_BASE_URL)) {
    return 'If you are running on a physical device, localhost will not reach your computer. Use your machine LAN IP as EXPO_PUBLIC_VERIBA_API_BASE_URL.';
  }

  if (
    Platform.OS !== 'web' &&
    /https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/.test(
      API_BASE_URL
    )
  ) {
    return 'Confirm this is your computer’s current LAN IP and that the backend is listening on that interface and port.';
  }

  return null;
}

function assertApiBaseUrl() {
  if (!API_BASE_URL && Platform.OS !== 'web') {
    throw new VeribaApiError(
      'Set EXPO_PUBLIC_VERIBA_API_BASE_URL before using the native Veriba app.',
      {
        code: 'api_base_url_missing',
        status: 0,
      }
    );
  }
}

async function parseResponse<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const contentType = response.headers.get('content-type');

  if (!contentType?.includes('application/json')) {
    return null;
  }

  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

async function refreshTokens(): Promise<TokenState | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
  const { refreshToken } = getTokenState();

  if (!refreshToken) {
      return null;
  }

    assertApiBaseUrl();

    const response = await fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    const payload = await parseResponse<{
      access_token: string;
      refresh_token: string;
      token_type: string;
    }>(response);

    if (!response.ok || !payload?.success || !payload.data) {
      return null;
    }

    const tokens = {
      accessToken: payload.data.access_token,
      refreshToken: payload.data.refresh_token,
      tokenType: payload.data.token_type,
    };

    onTokensUpdated(tokens);
    return tokens;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  assertApiBaseUrl();

  const {
    auth = true,
    body,
    headers: customHeaders,
    retryOnUnauthorized = true,
    ...rest
  } = options;
  const { accessToken, tokenType } = getTokenState();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...customHeaders,
  };

  if (auth && accessToken) {
    headers.Authorization = `${(tokenType ?? 'bearer').replace(/^bearer$/i, 'Bearer')} ${accessToken}`;
  }

  const init: RequestInit = {
    ...rest,
    headers,
  };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body != null) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const url = apiUrl(path);
  const method = init.method ?? 'GET';
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  console.log('[api.request] start', {
    method,
    url,
    auth,
  });

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      signal: controller?.signal,
    });
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const hint = getNetworkHint();
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown network error';

    console.error('[api.request] network failure', {
      method,
      url,
      message,
      hint,
    });

    if (controller?.signal.aborted) {
      throw new VeribaApiError(
        `Request timed out contacting ${url}. ${hint ?? ''}`.trim(),
        {
          code: 'request_timeout',
          details: {
            method,
            url,
            timeoutMs: REQUEST_TIMEOUT_MS,
          },
          status: 0,
        }
      );
    }

    throw new VeribaApiError(
      `Network request failed for ${url}. ${hint ?? ''}`.trim(),
      {
        code: 'network_error',
        details: {
          method,
          url,
          message,
        },
        status: 0,
      }
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  console.log('[api.request] response', {
    method,
    url,
    status: response.status,
    statusText: response.statusText,
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshTokens();

    if (refreshed?.accessToken) {
      return request<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }

    onUnauthorized();
    throw new VeribaApiError('Your session has expired. Please log in again.', {
      code: 'unauthorized',
      status: 401,
    });
  }

  if (response.status === 204) {
    return null as T;
  }

  const payload = await parseResponse<T>(response);

  if (!response.ok || !payload?.success || payload.error) {
    throw new VeribaApiError(
      payload?.error?.message ?? response.statusText ?? 'Request failed.',
      {
        code: payload?.error?.code ?? null,
        details: payload?.error?.details ?? null,
        status: response.status,
      }
    );
  }

  return payload.data as T;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function asString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeObscureMode(value: string | null | undefined): ObscureMode {
  switch (value) {
    case 'eyes':
    case 'upper':
    case 'full':
      return value;
    default:
      return 'none';
  }
}

function normalizeConsentTier(value: string | null | undefined): ConsentTier | null {
  switch (value) {
    case 'full':
    case 'partial':
    case 'full_blur':
    case 'decline':
      return value;
    default:
      return null;
  }
}

function normalizeSessionStatus(value: string | null | undefined): SessionStatus {
  switch (value) {
    case 'draft':
    case 'pending_after':
    case 'pending_consent':
    case 'ready_to_publish':
    case 'published':
    case 'declined':
    case 'unpublished':
      return value;
    default:
      return 'draft';
  }
}

function normalizeFollowUpStatus(value: string | null | undefined): FollowUpRequestStatus {
  switch (value) {
    case 'scheduled':
    case 'sent':
    case 'opened':
    case 'completed':
    case 'expired':
    case 'cancelled':
      return value;
    default:
      return 'not_scheduled';
  }
}

function deriveCoordinates(practice: PracticeResponse): Coordinates | null {
  const coordinates = practice.coordinates;

  if (
    coordinates &&
    typeof coordinates.lat === 'number' &&
    typeof coordinates.lng === 'number'
  ) {
    return {
      lat: coordinates.lat,
      lng: coordinates.lng,
    };
  }

  if (typeof practice.lat === 'number' && typeof practice.lng === 'number') {
    return {
      lat: practice.lat,
      lng: practice.lng,
    };
  }

  return null;
}

function buildCheckpointIcon(checkpoint: {
  id?: string | null;
  label?: string | null;
  icon?: string | null;
}) {
  if (checkpoint.icon) {
    return checkpoint.icon;
  }

  const key = `${checkpoint.id ?? ''} ${checkpoint.label ?? ''}`.toLowerCase();

  if (key.includes('capture')) {
    return '📷';
  }

  if (key.includes('consent') || key.includes('signature')) {
    return '✍️';
  }

  if (key.includes('publish') || key.includes('seo')) {
    return '🌐';
  }

  if (key.includes('hash') || key.includes('sign')) {
    return '🔐';
  }

  if (key.includes('location') || key.includes('geo')) {
    return '📍';
  }

  if (key.includes('follow')) {
    return '✉️';
  }

  return '•';
}

function buildRemotePhoto({
  id,
  uri,
  label,
  kind,
  capturedAt,
  obscuration,
}: {
  id: string;
  uri: string;
  label: string;
  kind: ProgressPhoto['kind'];
  capturedAt: string | null | undefined;
  obscuration: ProgressPhoto['obscuration'];
}): ProgressPhoto {
  return {
    id,
    uri,
    fileName: null,
    mimeType: null,
    capturedAt: capturedAt ?? new Date().toISOString(),
    hash: '',
    coordinates: null,
    source: 'remote',
    label,
    kind,
    submittedBy: 'provider',
    obscuration,
    uploaded: true,
  };
}

export function mapUser(user: AuthUserResponse, authProvider: AuthProvider = 'email'): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    initials: user.initials,
    avatarUrl: null,
    practiceId: user.practice_id,
    role: user.role ?? 'owner',
    authProvider,
    createdAt: user.created_at,
  };
}

export function mapPractice(practice: PracticeResponse, existing?: Practice | null): Practice {
  return {
    id: practice.id,
    name: practice.name,
    location: practice.location,
    coordinates: deriveCoordinates(practice),
    website: practice.website ?? '',
    widgetSlug: practice.widget_slug ?? slugify(practice.name),
    servicesOffered:
      practice.services ?? existing?.servicesOffered ?? [...DEFAULT_SERVICES_OFFERED],
    defaultDiscounts: {
      full: practice.default_discounts?.full ?? 150,
      partial: practice.default_discounts?.partial ?? 75,
      fullBlur: practice.default_discounts?.full_blur ?? 25,
    },
    creditExpirationDays: practice.credit_expiration_days ?? 180,
    autoPublish: practice.auto_publish ?? false,
    ownerId: practice.owner_id ?? '',
    bio: practice.bio ?? '',
    avatarUrl: practice.avatar_url ?? null,
    bookingUrl: practice.booking_url ?? '',
    featuredSessionId: practice.featured_session_id ?? null,
    hours: practice.hours ?? null,
    followersCount: practice.followers_count ?? 0,
    createdAt: practice.created_at,
    updatedAt: practice.updated_at,
  };
}

export function mapPracticeStats(stats: PracticeStatsResponse): PracticeStats {
  return {
    totalPublished: stats.total_published,
    totalPending: stats.total_pending,
    totalDeclined: stats.total_declined,
    profileViewsTotal: stats.profile_views_total,
    profileViewsThisWeek: stats.profile_views_this_week,
    seoImpressionsTotal: stats.seo_impressions_total,
    seoImpressionsThisWeek: stats.seo_impressions_this_week,
  };
}

export function mapSeo(
  seo: SessionDetailResponse['seo'],
  practice?: Practice | null
): SEOData | null {
  if (!seo) {
    return null;
  }

  const urlSlug = seo.url_slug ?? '';
  const website = practice?.website?.replace(/\/$/, '') ?? '';

  return {
    title: seo.title ?? '',
    altText: seo.alt_text ?? '',
    metaDescription: seo.meta_description ?? '',
    filename: seo.filename ?? '',
    urlSlug,
    url: website && urlSlug ? `${website}/before-after/${urlSlug}` : urlSlug,
  };
}

export function mapChainOfCustody(
  sessionId: string,
  rawChain: SessionDetailResponse['chain_of_custody']
): ChainOfCustody | null {
  if (!rawChain) {
    return null;
  }

  const checkpoints: CustodyCheckpoint[] = (rawChain.checkpoints ?? []).map((checkpoint, index) => ({
    id: checkpoint.id ?? `checkpoint-${index + 1}`,
    icon: buildCheckpointIcon(checkpoint),
    label: checkpoint.label ?? 'Verification',
    detail: checkpoint.detail ?? '',
    timestamp: checkpoint.timestamp ?? '',
    hash: checkpoint.hash ?? null,
    verified: checkpoint.verified ?? false,
  }));

  return {
    sessionId,
    checkpoints,
    allVerified: rawChain.all_verified ?? checkpoints.every((checkpoint) => checkpoint.verified),
  };
}

export function mapFollowUp(raw: FollowUpResponse | RawRecord, capturedAt?: string | null): FollowUpRequest {
  const source = raw as RawRecord;
  const scheduledFor = asString(source.send_at);
  const sentAt = asString(source.sent_at) ?? scheduledFor;
  const openedAt = asString(source.opened_at);
  const respondedAt = asString(source.uploaded_at);

  return {
    id: asString(source.id),
    method: 'patient_link',
    timing: '2_weeks',
    sendImmediately: false,
    status: normalizeFollowUpStatus(asString(source.status)),
    scheduledFor,
    sentAt,
    openedAt,
    respondedAt,
    patientDestination:
      asString(source.patient_email) ??
      normalizeBackendAssetUrl(asString(source.upload_url)) ??
      'Patient capture link',
    patientEmail: asString(source.patient_email) ?? '',
    patientFirstName: asString(source.patient_first_name) ?? '',
    patientUserId: asString(source.patient_user_id),
    memberMatchName:
      asString((source.member_match as RawRecord | null | undefined)?.name) ?? null,
    message: asString(source.message) ?? '',
    uploadUrl: normalizeBackendAssetUrl(asString(source.upload_url)),
    uploadToken: asString(source.upload_token),
    expiresAt: asString(source.expires_at),
  };
}

export function mapSession(
  session: SessionSummaryResponse | SessionDetailResponse,
  options?: {
    practice?: Practice | null;
    existing?: Session | null;
    followUpRequest?: FollowUpRequest | null;
    publishedDestinations?: PublishDestination[];
  }
): Session {
  const obscureMode = normalizeObscureMode(session.obscure_mode);
  const beforeObscuration = createPhotoObscuration(obscureMode);
  const afterObscuration = createPhotoObscuration(obscureMode);
  const photos: ProgressPhoto[] = [];
  const beforeImageUrl = normalizeBackendAssetUrl(session.before_image_url ?? null);
  const afterImageUrl = normalizeBackendAssetUrl(session.after_image_url ?? null);
  const consentSignatureUrl =
    'consent_signature_url' in session
      ? normalizeBackendAssetUrl(session.consent_signature_url ?? null)
      : options?.existing?.consentSignatureUrl ?? null;

  if (beforeImageUrl) {
    photos.push(
      buildRemotePhoto({
        id: `${session.id}-before`,
        uri: beforeImageUrl,
        label: 'Baseline',
        kind: 'baseline',
        capturedAt: session.captured_at,
        obscuration: beforeObscuration,
      })
    );
  }

  if (afterImageUrl) {
    photos.push(
      buildRemotePhoto({
        id: `${session.id}-after`,
        uri: afterImageUrl,
        label: 'After',
        kind: 'after',
        capturedAt: session.published_at ?? session.updated_at,
        obscuration: afterObscuration,
      })
    );
  }

  console.log('[api.mapSession]', {
    id: session.id,
    status: session.status,
    before_image_url: session.before_image_url ?? null,
    after_image_url: session.after_image_url ?? null,
    normalized_before_image_url: beforeImageUrl,
    normalized_after_image_url: afterImageUrl,
    photos_count: photos.length,
    captured_at: session.captured_at ?? null,
    updated_at: session.updated_at,
  });

  return {
    id: session.id,
    practiceId: options?.practice?.id ?? options?.existing?.practiceId ?? '',
    patientInitials: session.patient_initials,
    treatment: session.treatment,
    category: session.category,
    status: normalizeSessionStatus(session.status),
    photos,
    followUpRequest: options?.followUpRequest ?? options?.existing?.followUpRequest ?? null,
    beforePhotoUri: beforeImageUrl,
    afterPhotoUri: afterImageUrl,
    obscureMode,
    obscureRegion: options?.existing?.obscureRegion ?? beforeObscuration.region,
    beforeObscuration,
    afterObscuration,
    capturedAt: session.captured_at ?? null,
    captureHash: options?.existing?.captureHash ?? null,
    captureCoordinates: options?.existing?.captureCoordinates ?? null,
    signedAt: options?.existing?.signedAt ?? session.captured_at ?? null,
    signHash: options?.existing?.signHash ?? null,
    consentTier: normalizeConsentTier(session.consent_tier),
    consentSignatureSvg: options?.existing?.consentSignatureSvg ?? null,
    consentSignatureUrl,
    consentAt:
      'consent_at' in session ? session.consent_at ?? null : options?.existing?.consentAt ?? null,
    discountApplied:
      'discount_applied' in session
        ? session.discount_applied ?? null
        : options?.existing?.discountApplied ?? null,
    publishedAt: session.published_at ?? null,
    publishHash:
      'publish_hash' in session ? session.publish_hash ?? null : options?.existing?.publishHash ?? null,
    publishedDestinations:
      options?.publishedDestinations ??
      options?.existing?.publishedDestinations ??
      [],
    seo:
      'seo' in session
        ? mapSeo(session.seo, options?.practice)
        : options?.existing?.seo ?? null,
    pageViews: session.page_views ?? 0,
    savesCount: session.saves_count ?? options?.existing?.savesCount ?? 0,
    chainOfCustody:
      'chain_of_custody' in session
        ? mapChainOfCustody(session.id, session.chain_of_custody)
        : options?.existing?.chainOfCustody ?? null,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

export function buildSeoPreview(treatment: string, practice: Practice): SEOData {
  const treatmentSlug = slugify(treatment);
  const practiceSlug = slugify(practice.name);
  const urlSlug = `before-after-${treatmentSlug}-${practiceSlug}`;
  const website = practice.website.replace(/\/$/, '');

  return {
    title: `Before and After ${treatment} | ${practice.name}`,
    altText: `${treatment} before and after result`,
    metaDescription: `Before and after ${treatment.toLowerCase()} result at ${practice.name}`,
    filename: `${urlSlug}.jpg`,
    urlSlug,
    url: website ? `${website}/before-after/${urlSlug}` : urlSlug,
  };
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  role?: 'provider' | 'member';
  practice_name?: string;
  practice_location?: string;
  practice_website?: string;
}) {
  return request<{
    user: AuthUserResponse;
    practice: PracticeResponse | null;
    access_token: string;
    refresh_token: string;
    token_type: string;
  }>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: payload,
  });
}

export type PublicSessionCard = {
  id: string;
  treatment: string;
  category: string;
  before_image_url?: string | null;
  after_image_url?: string | null;
  before_blurhash?: string | null;
  after_blurhash?: string | null;
  published_at?: string | null;
  practice: {
    id: string;
    name: string;
    location: string;
    widget_slug?: string | null;
    website?: string | null;
    booking_url?: string | null;
    avatar_url?: string | null;
  };
};

export type PublicCustodyCheckpoint = {
  step: string;
  label: string;
  detail?: string | null;
  timestamp?: string | null;
  hash?: string | null;
  verified?: boolean;
};

export type SessionPhoto = {
  id: string;
  url: string;
  blurhash?: string | null;
  label?: string | null;
};

export type PublicCaseStudy = PublicSessionCard & {
  treatment_details?: string | null;
  page_views?: number;
  published_at?: string | null;
  provider?: { name?: string | null; initials?: string | null };
  photos?: SessionPhoto[] | null;
  chain_of_custody?: {
    all_verified?: boolean;
    checkpoint_count?: number;
    checkpoints?: PublicCustodyCheckpoint[];
  };
};

/** Full public case study for the detail screen (public — no auth). */
export async function fetchPublicCaseStudy(sessionId: string) {
  return request<{ session: PublicCaseStudy }>(`/api/gallery/sessions/${sessionId}`, {
    auth: false,
  });
}

/** Public clinic profile + its published cases (public — no auth). */
export async function fetchPublicPractice(slug: string) {
  return request<{ practice: PublicPracticeCard; sessions: PublicSessionCard[] }>(
    `/api/gallery/practices/${slug}`,
    { auth: false }
  );
}

/** Cross-clinic feed of published, consented cases (public — no auth). */
export async function fetchPublicGallery(limit = 48, query?: string, offset = 0) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set('query', query);
  if (offset > 0) params.set('offset', String(offset));
  return request<{ sessions: PublicSessionCard[]; total: number }>(
    `/api/gallery/sessions?${params.toString()}`,
    { auth: false }
  );
}

// --- Member interactions (/api/me/*) ---

export type PublicPracticeCard = {
  id: string;
  name: string;
  location: string;
  website?: string | null;
  widget_slug?: string | null;
  provider_name?: string | null;
  provider_initials?: string | null;
  published_session_count?: number;
  followed_at?: string;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_blurhash?: string | null;
  booking_url?: string | null;
  services?: string[] | null;
  featured_treatment?: string | null;
  featured_image_url?: string | null;
  hours?: Record<string, string | null> | null;
};

// --- Provider: manage the public practice page (PRACTICE-PROFILE-SPEC) ---

export type PracticeProfileUpdate = {
  name?: string;
  location?: string;
  website?: string | null;
  bio?: string | null;
  booking_url?: string | null;
  services?: string[] | null;
  featured_session_id?: string | null;
  hours?: Record<string, string | null> | null;
};

export async function updateMyPractice(payload: PracticeProfileUpdate) {
  return request<PracticeResponse>('/api/practices/me', {
    method: 'PATCH',
    body: payload,
  });
}

export async function uploadPracticeAvatar(photo: { uri: string; mimeType?: string | null }) {
  const formData = new FormData();
  formData.append('file', {
    uri: photo.uri,
    name: 'avatar.jpg',
    type: photo.mimeType ?? 'image/jpeg',
  } as never);
  return request<{ avatar_url: string }>('/api/practices/me/avatar', {
    method: 'POST',
    body: formData,
  });
}

export type ApprovalItem = {
  id: string;
  requested_at: string;
  practice: { id: string; name: string; location: string };
  session: {
    id: string;
    treatment: string;
    category: string;
    before_image_url?: string | null;
    after_image_url?: string | null;
  };
  discount_offer: { full: number; partial: number; full_blur: number };
};

export type ConsentDecision = 'full' | 'full_blur' | 'partial' | 'decline';

export async function saveCase(sessionId: string) {
  return request<{ session_id: string; saved_at: string }>(`/api/me/saves/${sessionId}`, {
    method: 'POST',
  });
}

export async function unsaveCase(sessionId: string) {
  return request<{ removed: boolean }>(`/api/me/saves/${sessionId}`, { method: 'DELETE' });
}

export async function listSaves(limit = 60) {
  return request<{ sessions: (PublicSessionCard & { saved_at: string })[]; total: number }>(
    `/api/me/saves?limit=${limit}`
  );
}

export async function followPractice(practiceId: string) {
  return request<{ practice_id: string; followed_at: string }>(
    `/api/me/follows/${practiceId}`,
    { method: 'POST' }
  );
}

export async function unfollowPractice(practiceId: string) {
  return request<{ removed: boolean }>(`/api/me/follows/${practiceId}`, { method: 'DELETE' });
}

export async function listFollows() {
  return request<{ practices: PublicPracticeCard[]; total: number }>('/api/me/follows');
}

export async function listApprovals() {
  return request<{ approvals: ApprovalItem[] }>('/api/me/approvals');
}

export type ActivityKind =
  | 'approval_completed'
  | 'case_published'
  | 'credit_earned'
  | 'credit_expiring'
  | 'consult_request';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  text: string;
  timestamp: string;
  session_id?: string | null;
};

/** Derived member activity for the Inbox "Earlier" section. */
export async function listMyActivity() {
  return request<{ items: ActivityItem[]; total: number }>('/api/me/activity');
}

export type MyResultCard = PublicSessionCard & {
  status: string;
  consent_tier?: string | null;
};

/** The member's own sessions (matched by followup email), incl. unpublished. */
export async function listMyResults() {
  return request<{ sessions: MyResultCard[]; total: number }>('/api/me/results');
}

// --- Consult requests (GROWTH-SPEC §1) ---

export type ConsultRequestItem = {
  id: string;
  practice: { id: string; name: string; widget_slug?: string | null };
  member?: { name?: string | null; initials?: string | null };
  session?: { id: string; treatment?: string | null; after_image_url?: string | null } | null;
  message?: string | null;
  contact_email: string;
  contact_phone?: string | null;
  status: 'new' | 'handled';
  created_at: string;
  handled_at?: string | null;
};

/** Member asks a clinic for a consult (one-shot, not chat). 409 = already open. */
export async function createConsultRequest(payload: {
  practice_id: string;
  session_id?: string | null;
  message?: string | null;
  contact_email: string;
  contact_phone?: string | null;
}) {
  return request<{ consult: ConsultRequestItem }>('/api/me/consults', {
    method: 'POST',
    body: payload,
  });
}

export async function listMyConsults() {
  return request<{ consults: ConsultRequestItem[]; total: number }>('/api/me/consults');
}

/** Provider inbox for the Messages tab. */
export async function listPracticeConsults(status: 'new' | 'handled' | 'all' = 'all') {
  return request<{ consults: ConsultRequestItem[]; total: number }>(
    `/api/consults?status=${status}`
  );
}

export async function markConsultHandled(consultId: string) {
  return request<{ consult: ConsultRequestItem }>(`/api/consults/${consultId}/handled`, {
    method: 'POST',
  });
}

/** Exact-match member lookup for followup linking (GROWTH-SPEC §6, practice auth). */
export async function lookupMember(query: { userId?: string; email?: string }) {
  const params = new URLSearchParams();
  if (query.userId) params.set('user_id', query.userId);
  if (query.email) params.set('email', query.email);
  return request<{ member: MemberMatch | null }>(`/api/members/lookup?${params.toString()}`);
}

// --- Push tokens (GROWTH-SPEC §4; delivery dark until APNs is configured) ---

export async function registerPushToken(token: string, platform: 'ios' | 'android') {
  return request<{ registered: boolean }>('/api/me/push-token', {
    method: 'POST',
    body: { token, platform },
  });
}

export async function removePushToken(token: string) {
  return request<{ removed: boolean }>('/api/me/push-token', {
    method: 'DELETE',
    body: { token },
  });
}

export async function respondToApproval(
  followupId: string,
  decision: ConsentDecision,
  signatureSvg?: string | null
) {
  return request<{
    consent_tier: string;
    reward_earned?: { amount?: number; code?: string; description?: string } | null;
  }>(`/api/me/approvals/${followupId}/respond`, {
    method: 'POST',
    body: { decision, signature_svg: signatureSvg ?? undefined },
  });
}

export async function login(payload: { email: string; password: string }) {
  return request<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: AuthUserResponse;
  }>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: payload,
  });
}

export async function logout() {
  return request<null>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser() {
  return request<AuthUserResponse>('/api/users/me');
}

export async function getCurrentPractice() {
  return request<PracticeResponse>('/api/practices/me');
}

export async function getPracticeStats() {
  return request<PracticeStatsResponse>('/api/practices/me/stats');
}

export async function listSessions(params?: {
  status?: SessionStatus;
  category?: TreatmentCategory;
  sort?: 'created_at' | 'updated_at' | 'page_views';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();

  if (params?.status) {
    query.set('status', params.status);
  }

  if (params?.category) {
    query.set('category', params.category);
  }

  query.set('sort', params?.sort ?? 'updated_at');
  query.set('order', params?.order ?? 'desc');
  query.set('limit', String(params?.limit ?? 50));
  query.set('offset', String(params?.offset ?? 0));

  return request<SessionListResponse>(`/api/sessions?${query.toString()}`);
}

export async function getSession(sessionId: string) {
  return request<SessionDetailResponse>(`/api/sessions/${sessionId}`);
}

export async function createSession(payload: {
  patient_initials: string;
  treatment: string;
  category: TreatmentCategory;
  status: 'draft' | 'pending_after';
}) {
  return request<SessionDetailResponse>('/api/sessions', {
    method: 'POST',
    body: payload,
  });
}

export async function updateSession(
  sessionId: string,
  payload: {
    patient_initials?: string;
    treatment?: string;
    category?: TreatmentCategory;
    obscure_mode?: ObscureMode;
    treatment_details?: string;
  }
) {
  return request<SessionDetailResponse>(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function uploadSessionImage(
  sessionId: string,
  imageKind: 'before' | 'after',
  photo: CapturedPhoto
) {
  const formData = new FormData();

  formData.append('file', {
    uri: photo.uri,
    name: photo.fileName ?? `${sessionId}-${imageKind}.jpg`,
    type: photo.mimeType ?? 'image/jpeg',
  } as never);

  if (photo.hash) {
    formData.append('capture_hash', photo.hash);
  }

  if (photo.coordinates?.lat != null) {
    formData.append('capture_lat', String(photo.coordinates.lat));
  }

  if (photo.coordinates?.lng != null) {
    formData.append('capture_lng', String(photo.coordinates.lng));
  }

  if (photo.capturedAt) {
    formData.append('captured_at', photo.capturedAt);
  }

  return request<{
    image_url: string;
    capture_hash?: string | null;
    capture_coordinates?: Coordinates | null;
    captured_at?: string | null;
    server_hash?: string | null;
    hash_match?: boolean | null;
    chain_of_custody_updated?: boolean | null;
  }>(`/api/sessions/${sessionId}/images/${imageKind}`, {
    method: 'POST',
    body: formData,
  });
}

export async function recordConsent(
  sessionId: string,
  payload: {
    consent_tier: Exclude<ConsentTier, 'decline'>;
    obscure_mode: ObscureMode;
    discount_applied: number;
    signature_svg: string;
    consent_form_version?: string;
  }
) {
  return request<{
    consent_tier: ConsentTier;
    obscure_mode: ObscureMode;
    consent_at: string;
    discount_applied: number;
    signature_url: string | null;
    chain_of_custody_updated: boolean;
    session_status: SessionStatus;
  }>(`/api/sessions/${sessionId}/consent`, {
    method: 'POST',
    body: payload,
  });
}

export async function declineConsent(sessionId: string) {
  return request<{
    consent_tier: 'decline';
    obscure_mode: 'full';
    status: 'declined';
  }>(`/api/sessions/${sessionId}/consent/decline`, {
    method: 'POST',
  });
}

export async function publishSession(
  sessionId: string,
  payload: {
    destinations: PublishDestination[];
    treatment_details?: string;
  }
) {
  return request<{
    status: SessionStatus;
    published_at: string;
    publish_hash: string;
    seo: NonNullable<SessionDetailResponse['seo']>;
    destinations: PublishDestination[];
    chain_of_custody_updated: boolean;
  }>(`/api/sessions/${sessionId}/publish`, {
    method: 'POST',
    body: payload,
  });
}

export async function unpublishSession(sessionId: string) {
  return request<SessionResponseWithStatus>(`/api/sessions/${sessionId}/unpublish`, {
    method: 'POST',
  });
}

export async function createSessionFollowUp(
  sessionId: string,
  payload: {
    patient_email: string;
    patient_first_name: string;
    send_at: string;
    message?: string;
    patient_user_id?: string | null;
  }
) {
  return request<FollowUpResponse>(`/api/sessions/${sessionId}/followup`, {
    method: 'POST',
    body: payload,
  });
}

export async function listSessionFollowUps(sessionId: string) {
  return request<{
    followups: RawRecord[];
  }>(`/api/sessions/${sessionId}/followups`);
}

export async function resendSessionFollowUp(sessionId: string, followUpId: string) {
  return request<FollowUpResponse>(`/api/sessions/${sessionId}/followup/${followUpId}/resend`, {
    method: 'POST',
  });
}
