import {
  completeAppThemePreferenceMutation,
  createAppThemeHydrationState,
  failAppThemePreferenceMutation,
  recordHydratedAppThemePreference,
  startAppThemePreferenceMutation,
} from "./app-theme-hydration";

describe("app theme hydration state", () => {
  it("사용자 변경이 없으면 저장된 초기 테마를 적용한다", () => {
    const result = recordHydratedAppThemePreference(
      createAppThemeHydrationState(),
      "dark"
    );

    expect(result.shouldApplyHydratedPreference).toBe(true);
    expect(result.nextState).toMatchObject({
      hydratedPreference: "dark",
      mutationStatus: "idle",
    });
  });

  it("사용자 변경이 진행 중이면 늦게 도착한 초기 테마를 보관만 한다", () => {
    const pendingState = startAppThemePreferenceMutation(
      createAppThemeHydrationState()
    );
    const result = recordHydratedAppThemePreference(pendingState, "dark");

    expect(result.shouldApplyHydratedPreference).toBe(false);
    expect(result.nextState).toMatchObject({
      hydratedPreference: "dark",
      mutationStatus: "pending",
    });
  });

  it("사용자 변경이 실패하면 보관한 초기 테마를 복구 대상으로 제공한다", () => {
    const pendingState = startAppThemePreferenceMutation(
      createAppThemeHydrationState()
    );
    const hydratedState = recordHydratedAppThemePreference(
      pendingState,
      "dark"
    ).nextState;
    const result = failAppThemePreferenceMutation(hydratedState);

    expect(result.hydratedPreferenceToRestore).toBe("dark");
    expect(result.nextState).toMatchObject({
      hydratedPreference: "dark",
      mutationStatus: "idle",
    });
  });

  it("사용자 변경이 성공하면 이후 초기 테마는 화면 preference를 덮어쓰지 않는다", () => {
    const succeededState = completeAppThemePreferenceMutation(
      startAppThemePreferenceMutation(createAppThemeHydrationState())
    );
    const result = recordHydratedAppThemePreference(succeededState, "dark");

    expect(result.shouldApplyHydratedPreference).toBe(false);
    expect(result.nextState).toMatchObject({
      hydratedPreference: "dark",
      mutationStatus: "succeeded",
    });
  });
});
