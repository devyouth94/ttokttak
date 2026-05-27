import { getCalendarRenderKey } from "./calendar-render-key";

describe("calendar render key", () => {
  it("보이는 월과 resolved theme이 같으면 같은 캘린더 렌더 키를 만든다", () => {
    expect(
      getCalendarRenderKey({
        resolvedTheme: "dark",
        visibleMonth: "2026-05",
      })
    ).toBe(
      getCalendarRenderKey({
        resolvedTheme: "dark",
        visibleMonth: "2026-05",
      })
    );
  });

  it("resolved theme이 바뀌면 캘린더 라이브러리 remount 키도 바뀐다", () => {
    expect(
      getCalendarRenderKey({
        resolvedTheme: "light",
        visibleMonth: "2026-05",
      })
    ).not.toBe(
      getCalendarRenderKey({
        resolvedTheme: "dark",
        visibleMonth: "2026-05",
      })
    );
  });

  it("보이는 월이 바뀌면 캘린더 라이브러리 remount 키도 바뀐다", () => {
    expect(
      getCalendarRenderKey({
        resolvedTheme: "dark",
        visibleMonth: "2026-05",
      })
    ).not.toBe(
      getCalendarRenderKey({
        resolvedTheme: "dark",
        visibleMonth: "2026-06",
      })
    );
  });
});
