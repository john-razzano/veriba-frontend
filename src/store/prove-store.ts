import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import { CONSENT_TIERS, DEFAULT_SERVICES_OFFERED, TREATMENTS, normalizeServicesOffered, type AuthProvider, type ConsentTier, type ObscureMode, type PublishDestination, type Session, type SessionStatus, type TreatmentCategory, type User, type WizardState, type CapturedPhoto, type ObscureRegion, type PhotoObscuration, type Practice } from '@/src/types';
import { MOCK_PRACTICE, MOCK_SESSIONS, MOCK_USER, createEmptyWizardState, generateSEO } from '@/src/data/mockData';
import { buildCombinedHash } from '@/src/utils/media';
import { createPhotoObscuration, getDefaultObscureRegion, syncPhotoObscuration } from '@/src/utils/obscure';

type EditableSessionFields = {
  treatment?: string;
  category?: TreatmentCategory;
  obscureMode?: ObscureMode;
  obscureRegion?: ObscureRegion;
  beforeObscuration?: PhotoObscuration;
  afterObscuration?: PhotoObscuration;
  status?: SessionStatus;
};

interface ProveStore {
  isAuthenticated: boolean;
  authProvider: AuthProvider | null;
  user: User | null;
  practice: Practice;
  sessions: Session[];
  wizard: WizardState;
  login: (provider: AuthProvider) => void;
  logout: () => void;
  startWizard: () => void;
  resetWizard: () => void;
  togglePracticeService: (treatment: string) => void;
  resetPracticeServices: () => void;
  hydrateWizardFromSession: (sessionId: string) => void;
  setWizardStep: (step: number) => void;
  setWizardTreatment: (treatment: string, category: TreatmentCategory) => void;
  setWizardPatientInitials: (initials: string) => void;
  setWizardPhoto: (slot: 'before' | 'after', photo: CapturedPhoto) => void;
  setWizardObscureMode: (mode: ObscureMode) => void;
  setWizardObscureRegion: (region: ObscureRegion) => void;
  setWizardPhotoObscuration: (
    slot: 'before' | 'after',
    obscuration: Partial<PhotoObscuration>
  ) => void;
  setWizardConsentTier: (tier: ConsentTier) => void;
  setWizardSignature: (svg: string | null) => void;
  toggleWizardDestination: (destination: PublishDestination) => void;
  publishWizardSession: () => Promise<string | null>;
  updateSession: (sessionId: string, fields: EditableSessionFields) => void;
  unpublishSession: (sessionId: string) => void;
}

function getTreatmentCategory(treatment: string): TreatmentCategory {
  return TREATMENTS.find((option) => option.label === treatment)?.category ?? 'Other';
}

function getConsentDiscount(consentTier: ConsentTier | null) {
  return CONSENT_TIERS.find((tier) => tier.id === consentTier)?.discountAmount ?? null;
}

function buildUser(provider: AuthProvider): User {
  return {
    ...MOCK_USER,
    authProvider: provider,
  };
}

export const useProveStore = create<ProveStore>((set, get) => ({
  isAuthenticated: false,
  authProvider: null,
  user: null,
  practice: MOCK_PRACTICE,
  sessions: MOCK_SESSIONS,
  wizard: createEmptyWizardState(),

  login: (provider) => {
    set({
      isAuthenticated: true,
      authProvider: provider,
      user: buildUser(provider),
    });
  },

  logout: () => {
    set({
      isAuthenticated: false,
      authProvider: null,
      user: null,
      wizard: createEmptyWizardState(),
    });
  },

  startWizard: () => {
    set({ wizard: createEmptyWizardState() });
  },

  resetWizard: () => {
    set({ wizard: createEmptyWizardState() });
  },

  togglePracticeService: (treatment) => {
    set((state) => {
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
    const defaultServices: string[] = [...DEFAULT_SERVICES_OFFERED];

    set((state) => ({
      practice: {
        ...state.practice,
        servicesOffered: defaultServices,
        updatedAt: new Date().toISOString(),
      },
      wizard:
        state.wizard.treatment && !defaultServices.includes(state.wizard.treatment)
          ? {
              ...state.wizard,
              treatment: null,
              category: null,
            }
          : state.wizard,
    }));
  },

  hydrateWizardFromSession: (sessionId) => {
    const session = get().sessions.find((item) => item.id === sessionId);

    if (!session) {
      return;
    }

    set({
      wizard: {
        step: session.consentTier ? 4 : 3,
        treatment: session.treatment,
        category: session.category,
        beforePhoto: session.beforePhotoUri
          ? {
              uri: session.beforePhotoUri,
              capturedAt: session.capturedAt,
              hash: session.captureHash,
              coordinates: session.captureCoordinates,
              source: 'camera',
            }
          : null,
        afterPhoto: session.afterPhotoUri
          ? {
              uri: session.afterPhotoUri,
              capturedAt: session.capturedAt,
              hash: session.captureHash,
              coordinates: session.captureCoordinates,
              source: 'camera',
            }
          : null,
        patientInitials: session.patientInitials,
        obscureMode: session.obscureMode,
        obscureRegion: session.obscureRegion ?? getDefaultObscureRegion(session.obscureMode),
        beforeObscuration:
          session.beforeObscuration ?? createPhotoObscuration(session.obscureMode),
        afterObscuration:
          session.afterObscuration ?? createPhotoObscuration(session.obscureMode),
        consentTier: session.consentTier,
        signatureSvg: session.consentSignatureSvg,
        signed: Boolean(session.consentSignatureSvg),
        consentRecordedAt: session.consentAt,
        publishDestinations:
          session.publishedDestinations.length > 0
            ? session.publishedDestinations
            : ['widget', 'gallery'],
      },
    });
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
      },
    }));
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
        consentRecordedAt: new Date().toISOString(),
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
    const state = get();
    const { wizard, practice, user } = state;

    if (
      !user ||
      !wizard.treatment ||
      !wizard.category ||
      !wizard.beforePhoto ||
      !wizard.afterPhoto
    ) {
      return null;
    }

    const now = new Date().toISOString();
    const consentTier = wizard.consentTier;
    const captureHash = await buildCombinedHash(
      wizard.beforePhoto.hash,
      wizard.afterPhoto.hash,
      wizard.beforePhoto.capturedAt,
      wizard.afterPhoto.capturedAt
    );
    const publishHash = consentTier
      ? await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${captureHash}:${consentTier}:${now}`
        )
      : null;
    const status: SessionStatus = 'published';
    const publishedAt = now;
    const destinations = wizard.publishDestinations;
    const sessionId = `session_${Date.now()}`;
    const createdSession: Session = {
      id: sessionId,
      practiceId: practice.id,
      patientInitials: wizard.patientInitials || 'PA',
      treatment: wizard.treatment,
      category: wizard.category,
      status,
      beforePhotoUri: wizard.beforePhoto.uri,
      afterPhotoUri: wizard.afterPhoto.uri,
      obscureMode: wizard.obscureMode,
      obscureRegion: wizard.obscureRegion,
      beforeObscuration: wizard.beforeObscuration,
      afterObscuration: wizard.afterObscuration,
      capturedAt: wizard.beforePhoto.capturedAt,
      captureHash,
      captureCoordinates: wizard.beforePhoto.coordinates,
      signedAt: wizard.afterPhoto.capturedAt,
      signHash: captureHash,
      consentTier,
      consentSignatureSvg: wizard.signatureSvg,
      consentAt: wizard.consentRecordedAt,
      discountApplied: getConsentDiscount(consentTier),
      publishedAt,
      publishHash,
      publishedDestinations: destinations,
      seo: generateSEO(wizard.treatment, practice),
      pageViews: 0,
      createdAt: now,
      updatedAt: now,
    };

    set((current) => ({
      sessions: [createdSession, ...current.sessions],
    }));

    return createdSession.id;
  },

  updateSession: (sessionId, fields) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        const treatment = fields.treatment ?? session.treatment;
        const category = fields.category ?? getTreatmentCategory(treatment);
        const obscureMode = fields.obscureMode ?? session.obscureMode;
        const obscureRegion =
          fields.obscureRegion ??
          (fields.obscureMode && fields.obscureMode !== session.obscureMode
            ? getDefaultObscureRegion(fields.obscureMode)
            : session.obscureRegion);

        const beforeObscuration =
          fields.beforeObscuration ??
          (fields.obscureMode && fields.obscureMode !== session.obscureMode
            ? createPhotoObscuration(fields.obscureMode)
            : session.beforeObscuration);
        const afterObscuration =
          fields.afterObscuration ??
          (fields.obscureMode && fields.obscureMode !== session.obscureMode
            ? createPhotoObscuration(fields.obscureMode)
            : session.afterObscuration);

        return {
          ...session,
          ...fields,
          treatment,
          category,
          obscureMode,
          obscureRegion,
          beforeObscuration,
          afterObscuration,
          seo: treatment !== session.treatment ? generateSEO(treatment, state.practice) : session.seo,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  unpublishSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              status: 'unpublished',
              publishedAt: null,
              publishHash: null,
              publishedDestinations: [],
              updatedAt: new Date().toISOString(),
            }
          : session
      ),
    }));
  },
}));
