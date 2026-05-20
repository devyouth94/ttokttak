import {
  pressMainBottomNavRoute,
  shouldShowMainBottomNav,
} from "./main-bottom-nav.helpers";

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

  it("탭 press가 기본 동작을 막으면 새 이동 action을 만들지 않는다", () => {
    const emit = jest.fn(() => ({ defaultPrevented: true }));
    const dispatch = jest.fn();

    pressMainBottomNavRoute({
      isFocused: false,
      navigation: { dispatch, emit },
      route: {
        key: "settings-key",
        name: "settings",
        params: undefined,
      },
      stateKey: "tabs-state",
    });

    expect(emit).toHaveBeenCalledWith({
      canPreventDefault: true,
      target: "settings-key",
      type: "tabPress",
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("하단 탭은 탭 루트에서만 보이고 집중 화면에서는 숨겨진다", () => {
    expect(shouldShowMainBottomNav("/home")).toBe(true);
    expect(shouldShowMainBottomNav("/schedule")).toBe(true);
    expect(shouldShowMainBottomNav("/calendar")).toBe(true);
    expect(shouldShowMainBottomNav("/settings")).toBe(true);

    expect(shouldShowMainBottomNav("/home/notifications")).toBe(false);
    expect(shouldShowMainBottomNav("/items/new")).toBe(false);
    expect(shouldShowMainBottomNav("/items/item-id")).toBe(false);
    expect(shouldShowMainBottomNav("/items/item-id/edit")).toBe(false);
  });
});
