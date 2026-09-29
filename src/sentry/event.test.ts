import { sanitizeEvent } from "./event";

it("Sentry event에는 허용한 정보만 남긴다", () => {
  const sanitized = sanitizeEvent({
    breadcrumbs: [{ message: "private-title" }],
    contexts: { private: { value: "private-context" } },
    extra: { token: "private-token" },
    message: "private-message",
    request: { headers: { authorization: "private-authorization" } },
    tags: { feature: "schedule-mutation", private: "private-tag" },
    type: undefined,
    user: { email: "private@example.com" },
  });

  expect(sanitized.tags).toEqual({ feature: "schedule-mutation" });
  expect(JSON.stringify(sanitized)).not.toContain("private-");
});
