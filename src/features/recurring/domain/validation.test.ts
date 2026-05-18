import {
  defaultRecurringItemColorKey,
  type RecurringItemDraft,
} from "~/features/recurring/domain/types";
import { validateRecurringItemDraft } from "~/features/recurring/domain/validation";

function createDraft(
  overrides: Partial<RecurringItemDraft> = {}
): RecurringItemDraft {
  return {
    anchorType: "fixed",
    colorKey: defaultRecurringItemColorKey,
    description: null,
    intervalValue: null,
    isArchived: false,
    notificationsEnabled: true,
    recurrenceType: "daily",
    reminderTimeLocal: "09:00",
    startDateLocal: "2026-05-06",
    timezone: "Asia/Seoul",
    title: "물 마시기",
    weekdayMask: null,
    ...overrides,
  };
}

describe("validateRecurringItemDraft", () => {
  it("한 번 일정은 종료일을 가질 수 없다", () => {
    expect(
      validateRecurringItemDraft(
        createDraft({
          endDateLocal: "2026-05-10",
          recurrenceType: "once",
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "end_date_not_allowed",
          field: "endDateLocal",
        }),
      ])
    );
  });

  it("종료일은 시작일보다 빠를 수 없다", () => {
    expect(
      validateRecurringItemDraft(
        createDraft({
          endDateLocal: "2026-05-05",
          startDateLocal: "2026-05-06",
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "end_date_before_start_date",
          field: "endDateLocal",
        }),
      ])
    );
  });

  it("종료일이 있으면 기간 안에 최소 1개 occurrence가 있어야 한다", () => {
    expect(
      validateRecurringItemDraft(
        createDraft({
          endDateLocal: "2026-05-07",
          recurrenceType: "weekly",
          weekdayMask: [5],
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "end_date_without_occurrence",
          field: "endDateLocal",
        }),
      ])
    );
  });

  it("반복 간격이 유효하지 않으면 종료일 occurrence 검사를 건너뛰고 간격 오류만 반환한다", () => {
    expect(
      validateRecurringItemDraft(
        createDraft({
          endDateLocal: "2026-05-07",
          intervalValue: 0,
          recurrenceType: "interval_weeks",
          weekdayMask: [5],
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "interval_value_invalid",
          field: "intervalValue",
        }),
      ])
    );
  });

  it("한 번 일정은 완료일 기준을 사용할 수 없다", () => {
    expect(
      validateRecurringItemDraft(
        createDraft({
          anchorType: "completion_based",
          recurrenceType: "once",
        })
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "anchor_type_not_allowed",
          field: "anchorType",
        }),
      ])
    );
  });

  it("일정 색상 key는 허용된 팔레트 값만 통과한다", () => {
    expect(
      validateRecurringItemDraft(createDraft({ colorKey: "purple" }))
    ).toEqual([]);

    const invalidIssues = validateRecurringItemDraft(
      createDraft({ colorKey: "pink" as RecurringItemDraft["colorKey"] })
    );

    expect(invalidIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "color_key_invalid",
          field: "colorKey",
        }),
      ])
    );
  });
});
