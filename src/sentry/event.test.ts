import { sanitizeEvent } from "./event";

describe("sanitizeEvent", () => {
  it("오류 분석에 허용한 정보만 남긴다", () => {
    expect(
      sanitizeEvent(
        {
          breadcrumbs: [{ message: "병원 예약" }],
          contexts: { notification: { title: "약 먹기" } },
          debug_meta: {
            images: [
              {
                code_file: "app.bundle",
                debug_id: "debug-id",
                type: "sourcemap",
              },
            ],
          },
          dist: "42",
          environment: "production",
          event_id: "event-1",
          exception: {
            values: [
              {
                stacktrace: {
                  frames: [
                    {
                      filename: "app.bundle",
                      function: "saveItem",
                      vars: { title: "병원 예약" },
                    },
                  ],
                },
                type: "Error",
                value: "'병원 예약' 일정을 저장하지 못했습니다.",
              },
            ],
          },
          extra: { authorization: "Bearer secret" },
          level: "error",
          message: "user@example.com",
          platform: "javascript",
          release: "ttokttak@1.0.3",
          request: { headers: { authorization: "Bearer secret" } },
          sdk: { name: "sentry.javascript.react-native", version: "7.11.0" },
          tags: {
            feature: "schedule-mutation",
            itemId: "item-1",
            reason: "item-updated",
          },
          timestamp: 1,
          threads: {
            values: [
              {
                id: 1,
                main: true,
                stacktrace: {
                  frames: [
                    {
                      filename: "native",
                      vars: { token: "secret" },
                    },
                  ],
                },
              },
            ],
          },
          type: undefined,
          user: { email: "user@example.com", id: "user-1" },
        },
        Object.assign(new Error("원본 오류"), {
          errorCode: "operation-failed",
          stage: "schedule",
        })
      )
    ).toEqual({
      debug_meta: {
        images: [
          {
            code_file: "app.bundle",
            debug_id: "debug-id",
            type: "sourcemap",
          },
        ],
      },
      dist: "42",
      environment: "production",
      event_id: "event-1",
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  filename: "app.bundle",
                  function: "saveItem",
                },
              ],
            },
            type: "Error",
          },
        ],
      },
      level: "error",
      platform: "javascript",
      release: "ttokttak@1.0.3",
      sdk: { name: "sentry.javascript.react-native", version: "7.11.0" },
      tags: {
        error_code: "operation-failed",
        feature: "schedule-mutation",
        reason: "item-updated",
        stage: "schedule",
      },
      threads: {
        values: [
          {
            id: 1,
            main: true,
            stacktrace: {
              frames: [{ filename: "native" }],
            },
          },
        ],
      },
      timestamp: 1,
      type: undefined,
    });
  });
});
