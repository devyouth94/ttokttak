import { router } from "expo-router";

import {
  navigateFromNotificationInboxItem,
  navigateFromNotificationResponse,
} from "~/features/notifications/notification-response-navigation";

jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "default",
}));

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

describe("notification response navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("알림함 item 탭은 payload 기반 상세 이동을 시도한다", () => {
    const didNavigate = navigateFromNotificationInboxItem({
      itemId: "item-1",
      itemScheduledAtUtc: "2026-04-23 09:00:00+00",
      notificationKind: "reminder",
      payload: {
        itemId: "item-1",
        notificationKind: "reminder",
        scheduledAtUtc: "2026-04-23T09:00:00.000Z",
        source: "recurring-item",
      },
    });

    expect(didNavigate).toBe(true);
    expect(router.push).toHaveBeenCalledWith({
      params: {
        itemId: "item-1",
        returnTo: "/(tabs)/home/notifications",
        scheduledAtUtc: "2026-04-23T09:00:00.000Z",
      },
      pathname: "/items/[itemId]",
    });
  });

  it("알림함 item은 payload가 없어도 row 대상 기반으로 상세 이동한다", () => {
    const didNavigate = navigateFromNotificationInboxItem({
      itemId: "item-1",
      itemScheduledAtUtc: "2026-04-23T09:00:00.000Z",
      notificationKind: "reminder",
      payload: {
        source: "unknown",
      },
    });

    expect(didNavigate).toBe(true);
    expect(router.push).toHaveBeenCalledWith({
      params: {
        itemId: "item-1",
        returnTo: "/(tabs)/home/notifications",
        scheduledAtUtc: "2026-04-23T09:00:00.000Z",
      },
      pathname: "/items/[itemId]",
    });
  });

  it("payload와 inbox row 대상이 다르면 상세 이동하지 않는다", () => {
    const didNavigate = navigateFromNotificationInboxItem({
      itemId: "item-1",
      itemScheduledAtUtc: "2026-04-23T09:00:00.000Z",
      notificationKind: "reminder",
      payload: {
        itemId: "item-2",
        notificationKind: "reminder",
        scheduledAtUtc: "2026-04-23T09:00:00.000Z",
        source: "recurring-item",
      },
    });

    expect(didNavigate).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("로컬 reminder 알림 tap은 payload 기반으로 반복 항목 상세로 이동한다", () => {
    const didNavigate = navigateFromNotificationResponse({
      actionIdentifier: "default",
      notification: {
        date: new Date("2026-04-23T09:00:00.000Z").getTime(),
        request: {
          content: {
            body: null,
            categoryIdentifier: null,
            data: {
              itemId: "item-1",
              notificationKind: "reminder",
              scheduledAtUtc: "2026-04-23T09:00:00.000Z",
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
    expect(router.push).toHaveBeenCalledWith({
      params: {
        itemId: "item-1",
        returnTo: "/home",
        scheduledAtUtc: "2026-04-23T09:00:00.000Z",
      },
      pathname: "/items/[itemId]",
    });
  });
});
