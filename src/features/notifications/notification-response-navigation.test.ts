import { router } from "expo-router";

import { navigateFromNotificationResponse } from "~/features/notifications/notification-response-navigation";

jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "default",
}));

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

describe("notification response navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("navigation 공개 surface에 알림함 item 전용 진입점을 두지 않는다", () => {
    const navigationModule = jest.requireActual(
      "~/features/notifications/notification-response-navigation"
    ) as Record<string, unknown>;

    expect(navigationModule).not.toHaveProperty(
      "navigateFromNotificationInboxItem"
    );
  });

  it("로컬 reminder 알림 tap은 홈 피드로 이동한다", () => {
    const didNavigate = navigateFromNotificationResponse({
      actionIdentifier: "default",
      notification: {
        date: new Date("2026-04-23T09:00:00.000Z").getTime(),
        request: {
          content: {
            body: null,
            categoryIdentifier: null,
            data: {
              notificationKind: "reminder",
              source: "recurring-item",
            },
            sound: null,
            subtitle: null,
            title: null,
          },
          identifier:
            "ttokttak:reminder:user-1:item-1:2026-04-23T09:00:00.000Z",
          trigger: null,
        },
      },
    });

    expect(didNavigate).toBe(true);
    expect(router.replace).toHaveBeenCalledWith("/home");
  });
});
