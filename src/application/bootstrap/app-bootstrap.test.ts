import { handleLocalNotificationResponse } from "~/application/bootstrap";
import type { LocalNotificationResponse } from "~/shared/lib/notifications";

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
  SplashScreen: {
    hideAsync: jest.fn(),
    preventAutoHideAsync: jest.fn(),
  },
}));

jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "default",
}));

jest.mock("~/session/provider", () => ({
  useSession: jest.fn(),
}));

jest.mock("~/features/notifications", () => ({
  getNotificationNavigationKey: jest.requireActual("~/features/notifications")
    .getNotificationNavigationKey,
  shouldNavigateHomeFromNotificationResponse: jest.requireActual(
    "~/features/notifications"
  ).shouldNavigateHomeFromNotificationResponse,
  useNotifications: jest.fn(),
}));

jest.mock("~/shared/lib/notifications", () => ({
  addLocalNotificationResponseReceivedListener: jest.fn(),
  clearLastLocalNotificationResponse: jest.fn(),
  configureDefaultLocalNotificationHandler: jest.fn(),
  defaultNotificationActionIdentifier: "default",
  getLastLocalNotificationResponse: jest.fn(),
  isLocalReminderNotificationPayload: (value: unknown) => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      candidate.notificationKind === "reminder" &&
      candidate.source === "recurring-item"
    );
  },
}));

describe("handleLocalNotificationResponse", () => {
  it("로컬 reminder 알림 tap은 홈으로 이동하고 알림 tap 후속 동기화를 실행한다", () => {
    const handledResponseKeys = new Set<string>();
    const navigateToHome = jest.fn();
    const syncAfterNotificationTap = jest.fn();

    const didHandle = handleLocalNotificationResponse({
      handledResponseKeys,
      navigateToHome,
      response: createLocalReminderNotificationResponse(),
      syncAfterNotificationTap,
    });

    expect(didHandle).toBe(true);
    expect(navigateToHome).toHaveBeenCalledTimes(1);
    expect(syncAfterNotificationTap).toHaveBeenCalledTimes(1);
    expect(handledResponseKeys.has("notification-1")).toBe(true);
  });

  it("이미 처리한 알림 response는 중복 이동과 동기화를 실행하지 않는다", () => {
    const handledResponseKeys = new Set<string>(["notification-1"]);
    const navigateToHome = jest.fn();
    const syncAfterNotificationTap = jest.fn();

    const didHandle = handleLocalNotificationResponse({
      handledResponseKeys,
      navigateToHome,
      response: createLocalReminderNotificationResponse(),
      syncAfterNotificationTap,
    });

    expect(didHandle).toBe(false);
    expect(navigateToHome).not.toHaveBeenCalled();
    expect(syncAfterNotificationTap).not.toHaveBeenCalled();
  });
});

function createLocalReminderNotificationResponse(): LocalNotificationResponse {
  return {
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
        identifier: "notification-1",
        trigger: null,
      },
    },
  } as LocalNotificationResponse;
}
