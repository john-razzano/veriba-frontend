import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import {
  buildSeoPreview,
  configureVeribaApiAuth,
  createSession,
  createSessionFollowUp,
  declineConsent,
  getCurrentPractice,
  getCurrentUser,
  getPracticeStats,
  getSession,
  listSessionFollowUps,
  listSessions,
  login as loginRequest,
  logout as logoutRequest,
  mapFollowUp,
  mapPractice,
  mapPracticeStats,
  mapSeo,
  mapSession,
  mapUser,
  publishSession,
  recordConsent,
  register as registerRequest,
  resendSessionFollowUp,
  unpublishSession as unpublishSessionRequest,
  updateSession as updateSessionRequest,
  uploadSessionImage,
  VeribaApiError,
} from '@/src/lib/veriba-api';
import {
  CONSENT_TIERS,
  DEFAULT_SERVICES_OFFERED,
  TREATMENTS,
  normalizeServicesOffered,
  type AuthProvider,
  type CapturedPhoto,
  type ConsentTier,
  type FollowUpRequest,
  type ObscureMode,
  type ObscureRegion,
  type PhotoObscuration,
  type Practice,
  type PracticeStats,
  type ProgressPhoto,
  type PublishDestination,
  type Session,
  type SessionStatus,
  type TreatmentCategory,
  type User,
  type WizardState,
} from '@/src/types';
import { resetMemberState } from '@/src/lib/me';
import { safeInitials } from '@/src/utils/format';
import { createPhotoObscuration, getDefaultObscureRegion, syncPhotoObscuration } from '@/src/utils/obscure';

type EditableSessionFields = {
  patientInitials?: string;
  treatment?: string;
  category?: TreatmentCategory;
  obscureMode?: ObscureMode;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = LoginPayload & {
  name: string;
  role?: 'provider' | 'member';
  practiceName?: string;
  practiceLocation?: string;
  practiceWebsite?: string;
};

interface ProveStore {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isBootstrapping: boolean;
  authProvider: AuthProvider | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  authError: string | null;
  user: User | null;
  practice: Practice | null;
  practiceStats: PracticeStats | null;
  sessions: Session[];
  wizard: WizardState;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  bootstrap: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshPracticeStats: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<Session | null>;
  startWizard: () => void;
  resetWizard: () => void;
  togglePracticeService: (treatment: string) => void;
  resetPracticeServices: () => void;
  hydrateWizardFromSession: (sessionId: string) => Promise<Session | null>;
  setWizardStep: (step: number) => void;
  setWizardTreatment: (treatment: string, category: TreatmentCategory) => void;
  setWizardPatientInitials: (initials: string) => void;
  setWizardPhoto: (slot: 'before' | 'after', photo: CapturedPhoto) => void;
  addWizardProgressPhoto: (photo: CapturedPhoto) => void;
  removeWizardProgressPhoto: (photoId: string) => void;
  setWizardObscureMode: (mode: ObscureMode) => void;
  setWizardObscureRegion: (region: ObscureRegion) => void;
  setWizardPhotoObscuration: (
    slot: 'before' | 'after',
    obscuration: Partial<PhotoObscuration>
  ) => void;
  setWizardFollowUpRequest: (request: Partial<FollowUpRequest>) => void;
  setWizardConsentTier: (tier: ConsentTier) => void;
  setWizardSignature: (svg: string | null) => void;
  toggleWizardDestination: (destination: PublishDestination) => void;
  publishWizardSession: () => Promise<{ id: string; mode: SessionStatus } | null>;
  updateSession: (sessionId: string, fields: EditableSessionFields) => Promise<void>;
  sendSessionFollowUpLink: (sessionId: string) => Promise<void>;
  unpublishSession: (sessionId: string) => Promise<void>;
}

const SECURE_KEYS = {
  accessToken: 'veriba_access_token',
  refreshToken: 'veriba_refresh_token',
  tokenType: 'veriba_token_type',
};

async function saveTokens(tokens: { accessToken: string; refreshToken: string; tokenType: string }) {
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEYS.accessToken, tokens.accessToken),
    SecureStore.setItemAsync(SECURE_KEYS.refreshToken, tokens.refreshToken),
    SecureStore.setItemAsync(SECURE_KEYS.tokenType, tokens.tokenType),
  ]);
}

async function loadTokens() {
  const [accessToken, refreshToken, tokenType] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS.accessToken),
    SecureStore.getItemAsync(SECURE_KEYS.refreshToken),
    SecureStore.getItemAsync(SECURE_KEYS.tokenType),
  ]);
  return { accessToken, refreshToken, tokenType };
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.accessToken),
    SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken),
    SecureStore.deleteItemAsync(SECURE_KEYS.tokenType),
  ]);
}

function getTreatmentCategory(treatment: string): TreatmentCategory {
  return TREATMENTS.find((option) => option.label === treatment)?.category ?? 'Other';
}

function getConsentDiscount(consentTier: ConsentTier | null) {
  return CONSENT_TIERS.find((tier) => tier.id === consentTier)?.discountAmount ?? null;
}

function getFollowUpScheduledFor(capturedAt: string, timing: FollowUpRequest['timing']) {
  const dayOffsets = {
    '3_days': 3,
    '1_week': 7,
    '2_weeks': 14,
    '1_month': 30,
  } as const;

  const nextDate = new Date(capturedAt);
  nextDate.setUTCDate(nextDate.getUTCDate() + dayOffsets[timing]);
  return nextDate.toISOString();
}

function createDraftFollowUpRequest(): FollowUpRequest {
  return {
    id: null,
    method: 'patient_link',
    timing: '2_weeks',
    sendImmediately: false,
    status: 'not_scheduled',
    scheduledFor: null,
    sentAt: null,
    openedAt: null,
    respondedAt: null,
    patientDestination: 'Patient email or SMS',
    patientEmail: '',
    patientFirstName: '',
    message: '',
    uploadUrl: null,
    uploadToken: null,
    expiresAt: null,
  };
}

function buildUploadedSessionPhoto(
  session: Session,
  imageKind: 'before' | 'after',
  fallbackPhoto: CapturedPhoto,
  upload: Awaited<ReturnType<typeof uploadSessionImage>>
): ProgressPhoto {
  return {
    id: `${session.id}-${imageKind}`,
    uri: upload.image_url,
    fileName: null,
    mimeType: null,
    capturedAt: upload.captured_at ?? fallbackPhoto.capturedAt,
    hash: upload.capture_hash ?? fallbackPhoto.hash,
    coordinates: upload.capture_coordinates ?? fallbackPhoto.coordinates ?? null,
    source: 'remote',
    uploaded: true,
    label: imageKind === 'before' ? 'Baseline' : 'After',
    kind: imageKind === 'before' ? 'baseline' : 'after',
    submittedBy: 'provider',
    obscuration: imageKind === 'before' ? session.beforeObscuration : session.afterObscuration,
  };
}

function applyUploadedImageToSession(
  session: Session,
  imageKind: 'before' | 'after',
  fallbackPhoto: CapturedPhoto,
  upload: Awaited<ReturnType<typeof uploadSessionImage>>
): Session {
  const uploadedPhoto = buildUploadedSessionPhoto(session, imageKind, fallbackPhoto, upload);
  const otherPhotos = session.photos.filter((photo) =>
    imageKind === 'before' ? photo.kind !== 'baseline' : photo.kind !== 'after'
  );
  const photos =
    imageKind === 'before' ? [uploadedPhoto, ...otherPhotos] : [...otherPhotos, uploadedPhoto];

  return {
    ...session,
    photos,
    beforePhotoUri: imageKind === 'before' ? upload.image_url : session.beforePhotoUri,
    afterPhotoUri: imageKind === 'after' ? upload.image_url : session.afterPhotoUri,
    capturedAt:
      imageKind === 'before'
        ? upload.captured_at ?? fallbackPhoto.capturedAt
        : session.capturedAt,
    captureHash:
      imageKind === 'before'
        ? upload.capture_hash ?? fallbackPhoto.hash
        : session.captureHash,
    captureCoordinates:
      imageKind === 'before'
        ? upload.capture_coordinates ?? fallbackPhoto.coordinates ?? session.captureCoordinates
        : session.captureCoordinates,
    updatedAt: new Date().toISOString(),
  };
}

function createEmptyWizardState(): WizardState {
  return {
    sessionId: null,
    step: 1,
    treatment: null,
    category: null,
    beforePhoto: null,
    afterPhoto: null,
    progressPhotos: [],
    patientInitials: '',
    obscureMode: 'none',
    obscureRegion: getDefaultObscureRegion('none'),
    beforeObscuration: createPhotoObscuration('none'),
    afterObscuration: createPhotoObscuration('none'),
    consentTier: null,
    signatureSvg: null,
    signed: false,
    consentRecordedAt: null,
    followUpRequest: createDraftFollowUpRequest(),
    publishDestinations: ['widget', 'gallery'],
  };
}

function createWizardAfterPhoto(photo: CapturedPhoto): ProgressPhoto {
  return {
    ...photo,
    id: `after_${Date.now()}`,
    kind: 'after',
    label: 'After',
    submittedBy: 'provider',
    obscuration: null,
  };
}

function buildRemoteWizardPhoto(session: Session, kind: 'before' | 'after'): CapturedPhoto | null {
  const uri = kind === 'before' ? session.beforePhotoUri : session.afterPhotoUri;

  if (!uri) {
    return null;
  }

  return {
    uri,
    fileName: null,
    mimeType: null,
    capturedAt: kind === 'before' ? session.capturedAt ?? session.createdAt : session.updatedAt,
    hash: session.captureHash ?? '',
    coordinates: session.captureCoordinates,
    source: 'remote',
    uploaded: true,
  };
}

function mergeSession(existing: Session | undefined, incoming: Session): Session {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    ...incoming,
    photos: incoming.photos.length > 0 ? incoming.photos : existing.photos,
    followUpRequest: incoming.followUpRequest ?? existing.followUpRequest,
    beforePhotoUri: incoming.beforePhotoUri ?? existing.beforePhotoUri,
    afterPhotoUri: incoming.afterPhotoUri ?? existing.afterPhotoUri,
    obscureRegion: incoming.obscureRegion ?? existing.obscureRegion,
    captureHash: incoming.captureHash ?? existing.captureHash,
    captureCoordinates: incoming.captureCoordinates ?? existing.captureCoordinates,
    signedAt: incoming.signedAt ?? existing.signedAt,
    signHash: incoming.signHash ?? existing.signHash,
    consentSignatureSvg: incoming.consentSignatureSvg ?? existing.consentSignatureSvg,
    consentSignatureUrl: incoming.consentSignatureUrl ?? existing.consentSignatureUrl,
    publishedDestinations:
      incoming.publishedDestinations.length > 0
        ? incoming.publishedDestinations
        : existing.publishedDestinations,
    seo: incoming.seo ?? existing.seo,
    chainOfCustody: incoming.chainOfCustody ?? existing.chainOfCustody,
  };
}

function upsertSessionList(current: Session[], incoming: Session[]) {
  const currentMap = new Map(current.map((session) => [session.id, session]));
  return incoming.map((session) => mergeSession(currentMap.get(session.id), session));
}

function upsertSingleSession(current: Session[], incoming: Session) {
  const existing = current.find((session) => session.id === incoming.id);
  const merged = mergeSession(existing, incoming);
  const remaining = current.filter((session) => session.id !== incoming.id);

  return [merged, ...remaining].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function isUnauthorizedError(error: unknown) {
  return error instanceof VeribaApiError && error.status === 401;
}

function reportBootstrapFailure(context: 'login' | 'register', error: unknown) {
  console.error(`[store] bootstrap failed after ${context}:`, error);
}

function createLoggedOutState(currentPractice?: Practice | null) {
  return {
    isAuthenticated: false,
    isAuthenticating: false,
    isBootstrapping: false,
    authProvider: null,
    accessToken: null,
    refreshToken: null,
    tokenType: null,
    authError: null,
    user: null,
    practice: currentPractice
      ? {
          ...currentPractice,
          servicesOffered: currentPractice.servicesOffered,
        }
      : null,
    practiceStats: null,
    sessions: [],
    wizard: createEmptyWizardState(),
  };
}

export const useProveStore = create<ProveStore>((set, get) => ({
  ...createLoggedOutState(),

  login: async ({ email, password }) => {
    set({
      isAuthenticating: true,
      authError: null,
    });

    try {
      console.log('[store.login] start', {
        email: email.trim(),
      });
      const response = await loginRequest({
        email: email.trim(),
        password,
      });
      console.log('[store.login] token response received', {
        userId: response.user.id,
      });

      await saveTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
      });
      console.log('[store.login] tokens saved');

      set({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
        authProvider: 'email',
        user: mapUser(response.user, 'email'),
        isAuthenticated: true,
      });
      console.log('[store.login] auth state updated');
    } catch (error) {
      console.error('[store.login] failed', error);
      set({
        ...createLoggedOutState(get().practice),
        authError: toErrorMessage(error),
      });
      throw error;
    } finally {
      set({
        isAuthenticating: false,
      });
    }

    console.log('[store.login] launching bootstrap in background');
    void get()
      .bootstrap()
      .catch((error) => {
        reportBootstrapFailure('login', error);
        if (!isUnauthorizedError(error)) {
          set({
            authError: toErrorMessage(error),
          });
        }
      });
  },

  register: async ({
    email,
    password,
    name,
    role = 'provider',
    practiceName,
    practiceLocation,
    practiceWebsite,
  }) => {
    set({
      isAuthenticating: true,
      authError: null,
    });

    try {
      console.log('[store.register] start', {
        email: email.trim(),
        role,
      });
      const response = await registerRequest({
        email: email.trim(),
        password,
        name: name.trim(),
        role,
        practice_name: role === 'provider' ? practiceName?.trim() : undefined,
        practice_location: role === 'provider' ? practiceLocation?.trim() : undefined,
        practice_website:
          role === 'provider' ? practiceWebsite?.trim() || undefined : undefined,
      });
      console.log('[store.register] token response received', {
        userId: response.user.id,
        practiceId: response.practice?.id ?? null,
      });

      await saveTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
      });
      console.log('[store.register] tokens saved');

      set({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
        authProvider: 'email',
        user: mapUser(response.user, 'email'),
        practice: response.practice ? mapPractice(response.practice, get().practice) : null,
        isAuthenticated: true,
      });
      console.log('[store.register] auth state updated');
    } catch (error) {
      console.error('[store.register] failed', error);
      set({
        ...createLoggedOutState(get().practice),
        authError: toErrorMessage(error),
      });
      throw error;
    } finally {
      set({
        isAuthenticating: false,
      });
    }

    void get()
      .bootstrap()
      .catch((error) => {
        reportBootstrapFailure('register', error);
        if (!isUnauthorizedError(error)) {
          set({
            authError: toErrorMessage(error),
          });
        }
      });
  },

  logout: async () => {
    const currentPractice = get().practice;

    try {
      if (get().accessToken) {
        await logoutRequest();
      }
    } catch {
      // Ignore logout failures and clear local session anyway.
    } finally {
      await clearTokens();
      resetMemberState();
      set(createLoggedOutState(currentPractice));
    }
  },

  restoreSession: async () => {
    const { accessToken, refreshToken, tokenType } = await loadTokens();

    if (!accessToken || !refreshToken) {
      return;
    }

    set({
      accessToken,
      refreshToken,
      tokenType,
      isAuthenticated: true,
      authProvider: 'email',
    });

    try {
      await get().bootstrap();
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearTokens();
        set(createLoggedOutState(get().practice));
        return;
      }

      throw error;
    }
  },

  bootstrap: async () => {
    set({
      isBootstrapping: true,
      authError: null,
    });

    try {
      const userResponse = await getCurrentUser();

      if (userResponse.role === 'member') {
        set({
          isAuthenticated: true,
          user: mapUser(userResponse, get().authProvider ?? 'email'),
          practice: null,
          practiceStats: null,
        });
        return;
      }

      const [practiceResponse, statsResponse, sessionListResult] = await Promise.all([
        getCurrentPractice(),
        getPracticeStats(),
        listSessions().catch((err) => {
          if (!isUnauthorizedError(err)) {
            console.error('[store] sessions failed to load during bootstrap:', err);
          }
          return null;
        }),
      ]);

      const practice = mapPractice(practiceResponse, get().practice);
      const sessions = (sessionListResult?.sessions ?? []).map((session) =>
        mapSession(session, {
          practice,
          existing: get().sessions.find((item) => item.id === session.id),
        })
      );

      set({
        isAuthenticated: true,
        user: mapUser(userResponse, get().authProvider ?? 'email'),
        practice,
        practiceStats: mapPracticeStats(statsResponse),
        sessions: upsertSessionList(get().sessions, sessions),
      });
    } finally {
      set({
        isBootstrapping: false,
      });
    }
  },

  refreshSessions: async () => {
    const practice = get().practice;

    if (!practice) {
      return;
    }

    const sessionListResponse = await listSessions();
    const sessions = sessionListResponse.sessions.map((session) =>
      mapSession(session, {
        practice,
        existing: get().sessions.find((item) => item.id === session.id),
      })
    );

    set({
      sessions: upsertSessionList(get().sessions, sessions),
    });
  },

  refreshPracticeStats: async () => {
    const statsResponse = await getPracticeStats();

    set({
      practiceStats: mapPracticeStats(statsResponse),
    });
  },

  loadSession: async (sessionId) => {
    const existing = get().sessions.find((item) => item.id === sessionId);
    const practice = get().practice;

    console.log('[store.loadSession] start', {
      sessionId,
      existing_status: existing?.status ?? null,
      existing_beforePhotoUri: existing?.beforePhotoUri ?? null,
      existing_afterPhotoUri: existing?.afterPhotoUri ?? null,
      existing_photos: existing?.photos.length ?? 0,
      practice_loaded: Boolean(practice),
    });

    const detail = await getSession(sessionId);
    console.log('[store.loadSession] detail response', {
      sessionId,
      status: detail.status,
      before_image_url: detail.before_image_url ?? null,
      after_image_url: detail.after_image_url ?? null,
      captured_at: detail.captured_at ?? null,
      updated_at: detail.updated_at,
    });
    let followUpRequest = existing?.followUpRequest ?? null;

    try {
      const followUps = await listSessionFollowUps(sessionId);
      const latestFollowUp = followUps.followups[0];

      if (latestFollowUp) {
        const mappedFollowUp = mapFollowUp(latestFollowUp, detail.captured_at);
        followUpRequest = {
          ...mappedFollowUp,
          timing: existing?.followUpRequest?.timing ?? '2_weeks',
        };
      }
    } catch {
      // Some sessions will not have follow-ups. Ignore lookup failures for now.
    }

    const session = mapSession(detail, {
      practice,
      existing,
      followUpRequest,
    });

    console.log('[store.loadSession] mapped session', {
      sessionId,
      status: session.status,
      beforePhotoUri: session.beforePhotoUri,
      afterPhotoUri: session.afterPhotoUri,
      photos: session.photos.map((photo) => ({
        id: photo.id,
        kind: photo.kind,
        uri: photo.uri,
        capturedAt: photo.capturedAt,
      })),
    });

    set({
      sessions: upsertSingleSession(get().sessions, session),
    });

    return session;
  },

  startWizard: () => {
    set({
      wizard: createEmptyWizardState(),
    });
  },

  resetWizard: () => {
    set({
      wizard: createEmptyWizardState(),
    });
  },

  togglePracticeService: (treatment) => {
    const practice = get().practice;

    if (!practice) {
      return;
    }

    set((state) => {
      if (!state.practice) {
        return state;
      }

      const currentlyEnabled = state.practice.servicesOffered.includes(treatment);

      if (currentlyEnabled && state.practice.servicesOffered.length === 1) {
        return state;
      }

      const nextServices = currentlyEnabled
        ? state.practice.servicesOffered.filter((item) => item !== treatment)
        : normalizeServicesOffered([...state.practice.servicesOffered, treatment]);

      const selectedTreatmentRemoved = currentlyEnabled && state.wizard.treatment === treatment;

      return {
        practice: {
          ...state.practice,
          servicesOffered: nextServices,
          updatedAt: new Date().toISOString(),
        },
        wizard: selectedTreatmentRemoved
          ? {
              ...state.wizard,
              treatment: null,
              category: null,
            }
          : state.wizard,
      };
    });
  },

  resetPracticeServices: () => {
    const practice = get().practice;

    if (!practice) {
      return;
    }

    const defaultServices = [...DEFAULT_SERVICES_OFFERED];

    set((state) => ({
      practice: state.practice
        ? {
            ...state.practice,
            servicesOffered: defaultServices,
            updatedAt: new Date().toISOString(),
          }
        : null,
      wizard:
        state.wizard.treatment &&
        !defaultServices.some((service) => service === state.wizard.treatment)
          ? {
              ...state.wizard,
              treatment: null,
              category: null,
            }
          : state.wizard,
    }));
  },

  hydrateWizardFromSession: async (sessionId) => {
    const session = await get().loadSession(sessionId);

    if (!session) {
      return null;
    }

    const beforePhoto = buildRemoteWizardPhoto(session, 'before');
    const afterPhoto = buildRemoteWizardPhoto(session, 'after');
    const progressPhotos = afterPhoto
      ? [
          {
            ...afterPhoto,
            id: `${session.id}-after`,
            kind: 'after',
            label: 'After',
            submittedBy: 'provider',
            obscuration: session.afterObscuration,
          } satisfies ProgressPhoto,
        ]
      : [];

    const alreadyHasConsent = Boolean(session.consentTier && session.consentAt);

    set({
      wizard: {
        sessionId: session.id,
        step:
          session.status === 'pending_after'
            ? 2
            : session.status === 'pending_consent'
              ? 3
              : session.status === 'ready_to_publish' || session.status === 'unpublished'
                ? 4
                : 2,
        treatment: session.treatment,
        category: session.category,
        beforePhoto,
        afterPhoto,
        progressPhotos,
        patientInitials: session.patientInitials,
        obscureMode: session.obscureMode,
        obscureRegion: session.obscureRegion ?? getDefaultObscureRegion(session.obscureMode),
        beforeObscuration: session.beforeObscuration,
        afterObscuration: session.afterObscuration,
        consentTier: session.consentTier,
        signatureSvg: alreadyHasConsent ? session.consentSignatureSvg ?? '<svg />' : null,
        signed: session.consentTier === 'decline' ? true : alreadyHasConsent,
        consentRecordedAt: session.consentAt,
        followUpRequest: session.followUpRequest ?? createDraftFollowUpRequest(),
        publishDestinations:
          session.publishedDestinations.length > 0
            ? session.publishedDestinations
            : ['widget', 'gallery'],
      },
    });

    return session;
  },

  setWizardStep: (step) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        step,
      },
    }));
  },

  setWizardTreatment: (treatment, category) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        treatment,
        category,
      },
    }));
  },

  setWizardPatientInitials: (initials) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        patientInitials: initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5),
      },
    }));
  },

  setWizardPhoto: (slot, photo) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        beforePhoto: slot === 'before' ? photo : state.wizard.beforePhoto,
        afterPhoto: slot === 'after' ? photo : state.wizard.afterPhoto,
        progressPhotos:
          slot === 'after' ? [createWizardAfterPhoto(photo)] : state.wizard.progressPhotos,
      },
    }));
  },

  addWizardProgressPhoto: (photo) => {
    const nextPhoto = createWizardAfterPhoto(photo);

    set((state) => ({
      wizard: {
        ...state.wizard,
        progressPhotos: [nextPhoto],
        afterPhoto: photo,
      },
    }));
  },

  removeWizardProgressPhoto: (photoId) => {
    set((state) => {
      const progressPhotos = state.wizard.progressPhotos.filter((photo) => photo.id !== photoId);

      return {
        wizard: {
          ...state.wizard,
          progressPhotos,
          afterPhoto: progressPhotos[0] ?? null,
        },
      };
    });
  },

  setWizardObscureMode: (mode) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        obscureMode: mode,
        obscureRegion: getDefaultObscureRegion(mode),
        beforeObscuration: createPhotoObscuration(mode),
        afterObscuration: createPhotoObscuration(mode),
      },
    }));
  },

  setWizardObscureRegion: (region) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        obscureRegion: region,
      },
    }));
  },

  setWizardPhotoObscuration: (slot, obscuration) => {
    set((state) => {
      const current =
        slot === 'before' ? state.wizard.beforeObscuration : state.wizard.afterObscuration;
      const next = syncPhotoObscuration(current, obscuration);

      return {
        wizard: {
          ...state.wizard,
          beforeObscuration: slot === 'before' ? next : state.wizard.beforeObscuration,
          afterObscuration: slot === 'after' ? next : state.wizard.afterObscuration,
        },
      };
    });
  },

  setWizardFollowUpRequest: (request) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        followUpRequest: {
          ...state.wizard.followUpRequest,
          ...request,
        },
      },
    }));
  },

  setWizardConsentTier: (tier) => {
    const matchingTier = CONSENT_TIERS.find((item) => item.id === tier);
    const nextMode = matchingTier?.obscureMode ?? get().wizard.obscureMode;
    const defaultBefore = createPhotoObscuration(nextMode);
    const defaultAfter = createPhotoObscuration(nextMode);

    set((state) => ({
      wizard: {
        ...state.wizard,
        consentTier: tier,
        obscureMode: nextMode,
        obscureRegion: getDefaultObscureRegion(nextMode),
        beforeObscuration: defaultBefore,
        afterObscuration: defaultAfter,
        signed: tier === 'decline' ? true : state.wizard.signed,
        signatureSvg: tier === 'decline' ? null : state.wizard.signatureSvg,
        consentRecordedAt: tier === 'decline' ? new Date().toISOString() : state.wizard.consentRecordedAt,
      },
    }));
  },

  setWizardSignature: (svg) => {
    set((state) => ({
      wizard: {
        ...state.wizard,
        signatureSvg: svg,
        signed: Boolean(svg),
        consentRecordedAt: svg ? new Date().toISOString() : state.wizard.consentRecordedAt,
      },
    }));
  },

  toggleWizardDestination: (destination) => {
    set((state) => {
      const destinations = state.wizard.publishDestinations.includes(destination)
        ? state.wizard.publishDestinations.filter((item) => item !== destination)
        : [...state.wizard.publishDestinations, destination];

      return {
        wizard: {
          ...state.wizard,
          publishDestinations: destinations,
        },
      };
    });
  },

  publishWizardSession: async () => {
    const { wizard, practice } = get();

    if (!practice || !wizard.treatment || !wizard.category || !wizard.beforePhoto) {
      return null;
    }

    const patientInitials = safeInitials(wizard.patientInitials);
    const hasAfterPhoto = Boolean(wizard.afterPhoto);
    const existingSession = wizard.sessionId
      ? get().sessions.find((item) => item.id === wizard.sessionId) ?? null
      : null;

    let workingSession = existingSession;
    let sessionId = wizard.sessionId;

    if (!sessionId) {
      const created = await createSession({
        patient_initials: patientInitials,
        treatment: wizard.treatment,
        category: wizard.category,
        status: hasAfterPhoto ? 'draft' : 'pending_after',
      });

      workingSession = mapSession(created, {
        practice,
        existing: existingSession,
      });
      sessionId = workingSession.id;

      set({
        sessions: upsertSingleSession(get().sessions, workingSession),
      });
    } else {
      const updated = await updateSessionRequest(sessionId, {
        patient_initials: patientInitials,
        treatment: wizard.treatment,
        category: wizard.category,
        obscure_mode: wizard.obscureMode,
      });

      workingSession = mapSession(updated, {
        practice,
        existing: existingSession,
      });

      set({
        sessions: upsertSingleSession(get().sessions, workingSession),
      });
    }

    if (!sessionId) {
      return null;
    }

    if (wizard.beforePhoto.source !== 'remote') {
      const upload = await uploadSessionImage(sessionId, 'before', wizard.beforePhoto);
      console.log('[store.publishWizardSession] before upload complete', {
        sessionId,
        image_url: upload.image_url,
        captured_at: upload.captured_at ?? null,
        capture_hash: upload.capture_hash ?? null,
      });

      if (workingSession) {
        workingSession = applyUploadedImageToSession(
          workingSession,
          'before',
          wizard.beforePhoto,
          upload
        );

        set({
          sessions: upsertSingleSession(get().sessions, workingSession),
        });
      }
    }

    if (wizard.afterPhoto && wizard.afterPhoto.source !== 'remote') {
      const upload = await uploadSessionImage(sessionId, 'after', wizard.afterPhoto);
      console.log('[store.publishWizardSession] after upload complete', {
        sessionId,
        image_url: upload.image_url,
        captured_at: upload.captured_at ?? null,
        capture_hash: upload.capture_hash ?? null,
      });

      if (workingSession) {
        workingSession = applyUploadedImageToSession(
          workingSession,
          'after',
          wizard.afterPhoto,
          upload
        );

        set({
          sessions: upsertSingleSession(get().sessions, workingSession),
        });
      }
    }

    if (!wizard.afterPhoto) {
      let followUpRequest: FollowUpRequest | null = null;

      if (
        wizard.followUpRequest.method === 'patient_link' &&
        wizard.followUpRequest.patientEmail.trim() &&
        wizard.followUpRequest.patientFirstName.trim()
      ) {
        const rawFollowUp = await createSessionFollowUp(sessionId, {
          patient_email: wizard.followUpRequest.patientEmail.trim(),
          patient_first_name: wizard.followUpRequest.patientFirstName.trim(),
          send_at: wizard.followUpRequest.sendImmediately
            ? new Date().toISOString()
            : getFollowUpScheduledFor(
                wizard.beforePhoto.capturedAt,
                wizard.followUpRequest.timing
              ),
          message: wizard.followUpRequest.message.trim() || undefined,
        });

        followUpRequest = {
          ...wizard.followUpRequest,
          ...mapFollowUp(rawFollowUp, wizard.beforePhoto.capturedAt),
          timing: wizard.followUpRequest.timing,
          method: 'patient_link',
          sendImmediately: wizard.followUpRequest.sendImmediately,
          patientDestination: wizard.followUpRequest.patientEmail.trim(),
        };
      } else if (wizard.followUpRequest.method === 'follow_up_visit') {
        followUpRequest = {
          ...wizard.followUpRequest,
          sendImmediately: false,
          status: 'scheduled',
          scheduledFor: getFollowUpScheduledFor(
            wizard.beforePhoto.capturedAt,
            wizard.followUpRequest.timing
          ),
          sentAt: null,
          openedAt: null,
          respondedAt: null,
          patientDestination: 'In-clinic follow-up visit',
        };
      } else {
        followUpRequest = {
          ...wizard.followUpRequest,
          sendImmediately: false,
          status: 'not_scheduled',
          scheduledFor: null,
          sentAt: null,
          openedAt: null,
          respondedAt: null,
        };
      }

      const refreshed = await get().loadSession(sessionId);
      const finalSession =
        refreshed && followUpRequest
          ? {
              ...refreshed,
              followUpRequest,
            }
          : refreshed;

      if (finalSession) {
        set({
          sessions: upsertSingleSession(get().sessions, finalSession),
        });
      }

      await get().refreshPracticeStats();
      return {
        id: sessionId,
        mode: finalSession?.status ?? 'pending_after',
      };
    }

    const consentAlreadyRecorded = Boolean(
      workingSession?.consentAt &&
        workingSession?.consentTier &&
        workingSession.status !== 'pending_consent'
    );

    if (wizard.consentTier === 'decline') {
      await declineConsent(sessionId);
      const refreshed = await get().loadSession(sessionId);

      await get().refreshPracticeStats();
      return {
        id: sessionId,
        mode: refreshed?.status ?? 'declined',
      };
    }

    if (!wizard.consentTier) {
      return null;
    }

    let consentResponse:
      | {
          consent_at: string;
          signature_url: string | null;
          discount_applied: number;
        }
      | null = null;

    if (!consentAlreadyRecorded) {
      if (!wizard.signatureSvg) {
        return null;
      }

      const response = await recordConsent(sessionId, {
        consent_tier: wizard.consentTier,
        obscure_mode: wizard.obscureMode,
        discount_applied: getConsentDiscount(wizard.consentTier) ?? 0,
        signature_svg: wizard.signatureSvg,
        consent_form_version: '1.0',
      });

      consentResponse = {
        consent_at: response.consent_at,
        signature_url: response.signature_url,
        discount_applied: response.discount_applied,
      };
    }

    const publishResponse = await publishSession(sessionId, {
      destinations: wizard.publishDestinations,
    });
    const refreshed = await get().loadSession(sessionId);

    if (refreshed) {
      const publishedSession: Session = {
        ...refreshed,
        status: publishResponse.status,
        consentAt: consentResponse?.consent_at ?? refreshed.consentAt,
        consentSignatureUrl:
          consentResponse?.signature_url ?? refreshed.consentSignatureUrl,
        discountApplied: consentResponse?.discount_applied ?? refreshed.discountApplied,
        publishedAt: publishResponse.published_at,
        publishHash: publishResponse.publish_hash,
        publishedDestinations: publishResponse.destinations,
        seo: mapSeo(publishResponse.seo, practice) ?? refreshed.seo,
      };

      set({
        sessions: upsertSingleSession(get().sessions, publishedSession),
      });
    }

    await get().refreshPracticeStats();
    return {
      id: sessionId,
      mode: publishResponse.status,
    };
  },

  updateSession: async (sessionId, fields) => {
    const session = get().sessions.find((item) => item.id === sessionId);
    const practice = get().practice;

    if (!session || !practice) {
      return;
    }

    const treatment = fields.treatment ?? session.treatment;
    const category = fields.category ?? getTreatmentCategory(treatment);
    const obscureMode = fields.obscureMode ?? session.obscureMode;
    const response = await updateSessionRequest(sessionId, {
      patient_initials: fields.patientInitials,
      treatment,
      category,
      obscure_mode: obscureMode,
    });

    const updatedSession = mapSession(response, {
      practice,
      existing: {
        ...session,
        patientInitials: fields.patientInitials ?? session.patientInitials,
        obscureMode,
        obscureRegion: getDefaultObscureRegion(obscureMode),
        beforeObscuration: createPhotoObscuration(obscureMode),
        afterObscuration: createPhotoObscuration(obscureMode),
      },
    });

    set({
      sessions: upsertSingleSession(get().sessions, updatedSession),
    });
  },

  sendSessionFollowUpLink: async (sessionId) => {
    const session = get().sessions.find((item) => item.id === sessionId);

    if (!session?.followUpRequest?.id) {
      throw new Error('This session does not have a resendable follow-up yet.');
    }

    const rawFollowUp = await resendSessionFollowUp(sessionId, session.followUpRequest.id);
    const followUpRequest = {
      ...session.followUpRequest,
      ...mapFollowUp(rawFollowUp, session.capturedAt),
      timing: session.followUpRequest.timing,
    };

    set({
      sessions: get().sessions.map((item) =>
        item.id === sessionId
          ? {
              ...item,
              followUpRequest,
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    });
  },

  unpublishSession: async (sessionId) => {
    const response = await unpublishSessionRequest(sessionId);
    const practice = get().practice;
    const existing = get().sessions.find((item) => item.id === sessionId);

    if (!practice || !existing) {
      return;
    }

    const refreshed = await get().loadSession(sessionId);
    const nextSession =
      refreshed ??
      {
        ...existing,
        status: response.status ?? 'unpublished',
        publishedAt: null,
        publishHash: null,
        publishedDestinations: [],
      };

    set({
      sessions: upsertSingleSession(get().sessions, {
        ...nextSession,
        status: response.status ?? 'unpublished',
        publishedAt: null,
        publishHash: null,
        publishedDestinations: [],
      }),
    });

    await get().refreshPracticeStats();
  },
}));

configureVeribaApiAuth({
  getTokenState: () => {
    const state = useProveStore.getState();

    return {
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      tokenType: state.tokenType,
    };
  },
  onTokensUpdated: (tokens) => {
    useProveStore.setState({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      isAuthenticated: Boolean(tokens.accessToken),
    });
  },
  onUnauthorized: () => {
    void clearTokens();
    useProveStore.setState(createLoggedOutState(useProveStore.getState().practice));
  },
});
