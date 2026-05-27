import type { AppThemePreference } from "./app-theme";

type AppThemePreferenceMutationStatus = "idle" | "pending" | "succeeded";

export type AppThemeHydrationState = {
  hydratedPreference: AppThemePreference | null;
  mutationStatus: AppThemePreferenceMutationStatus;
};

export function createAppThemeHydrationState(): AppThemeHydrationState {
  return {
    hydratedPreference: null,
    mutationStatus: "idle",
  };
}

export function recordHydratedAppThemePreference(
  state: AppThemeHydrationState,
  hydratedPreference: AppThemePreference
): {
  nextState: AppThemeHydrationState;
  shouldApplyHydratedPreference: boolean;
} {
  return {
    nextState: {
      ...state,
      hydratedPreference,
    },
    shouldApplyHydratedPreference: state.mutationStatus === "idle",
  };
}

export function startAppThemePreferenceMutation(
  state: AppThemeHydrationState
): AppThemeHydrationState {
  return {
    ...state,
    mutationStatus: "pending",
  };
}

export function completeAppThemePreferenceMutation(
  state: AppThemeHydrationState
): AppThemeHydrationState {
  return {
    ...state,
    mutationStatus: "succeeded",
  };
}

export function failAppThemePreferenceMutation(state: AppThemeHydrationState): {
  nextState: AppThemeHydrationState;
  hydratedPreferenceToRestore: AppThemePreference | null;
} {
  return {
    nextState: {
      ...state,
      mutationStatus: "idle",
    },
    hydratedPreferenceToRestore: state.hydratedPreference,
  };
}
