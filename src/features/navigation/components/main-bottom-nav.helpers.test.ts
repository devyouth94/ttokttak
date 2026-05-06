import { pressMainBottomNavRoute } from "~/features/navigation/components/main-bottom-nav.helpers";

describe("main-bottom-nav helpers", () => {
  it("비활성 탭을 누르면 탭 navigator 안에서 route 이름으로 이동한다", () => {
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const dispatch = jest.fn();

    pressMainBottomNavRoute({
      isFocused: false,
      navigation: { dispatch, emit },
      route: {
        key: "calendar-key",
        name: "calendar",
        params: undefined,
      },
      stateKey: "tabs-state",
    });

    expect(emit).toHaveBeenCalledWith({
      canPreventDefault: true,
      target: "calendar-key",
      type: "tabPress",
    });
    expect(dispatch).toHaveBeenCalledWith({
      payload: { name: "calendar", params: undefined },
      target: "tabs-state",
      type: "NAVIGATE",
    });
  });

  it("현재 탭을 다시 누르면 새 이동 action을 만들지 않는다", () => {
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const dispatch = jest.fn();

    pressMainBottomNavRoute({
      isFocused: true,
      navigation: { dispatch, emit },
      route: {
        key: "home-key",
        name: "home",
        params: undefined,
      },
      stateKey: "tabs-state",
    });

    expect(emit).toHaveBeenCalledWith({
      canPreventDefault: true,
      target: "home-key",
      type: "tabPress",
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
