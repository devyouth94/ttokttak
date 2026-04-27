import {
  sanitizeSentryEvent,
  SENTRY_MASKED_VALUE,
} from "~/lib/sentry-sanitizer";

describe("sanitizeSentryEvent", () => {
  it("token, credential, push payload, 일정 제목과 본문을 마스킹한다", () => {
    const event = sanitizeSentryEvent({
      breadcrumbs: [
        {
          data: {
            scheduledAtUtc: "2026-04-27T00:00:00.000Z",
          },
          message: "Bearer abcdefghijklmnop.abcdefghijklmnop.abcdefghijklmnop",
        },
      ],
      contexts: {
        notification: {
          body: "약 먹기",
          payload: {
            itemId: "item-1",
          },
          title: "아침 약",
        },
      },
      extra: {
        authorization: "Bearer secret-token",
        pushToken: "push-token",
        responsePayload: {
          error: "provider-error",
        },
      },
      user: {
        email: "user@example.com",
        id: "user-1",
      },
    });

    expect(event).toMatchObject({
      breadcrumbs: [
        {
          data: SENTRY_MASKED_VALUE,
          message: `Bearer ${SENTRY_MASKED_VALUE}`,
        },
      ],
      contexts: {
        notification: SENTRY_MASKED_VALUE,
      },
      extra: {
        authorization: SENTRY_MASKED_VALUE,
        pushToken: SENTRY_MASKED_VALUE,
        responsePayload: SENTRY_MASKED_VALUE,
      },
      user: {
        email: SENTRY_MASKED_VALUE,
        id: "user-1",
      },
    });
  });
});
