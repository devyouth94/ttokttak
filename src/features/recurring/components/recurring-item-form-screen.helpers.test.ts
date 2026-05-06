import {
  createDefaultFormState,
  getFirstReminderHelperText,
  getMinimumStartDateLocal,
  normalizeStartDateSelection,
  recurringItemColorOptions,
  recurringItemFormSchema,
  type RecurringItemFormValues,
  toDraft,
  toFormState,
} from "~/features/recurring/components/recurring-item-form-screen.helpers";
import { type RecurringItem } from "~/features/recurring/domain/types";

function getValidationMessages(
  overrides: Partial<RecurringItemFormValues>
): string[] {
  const result = recurringItemFormSchema.safeParse({
    ...createDefaultFormState(),
    ...overrides,
  });

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => issue.message);
}

describe("recurring item form start date rules", () => {
  it("생성 화면의 시작일 하한선은 오늘이다", () => {
    expect(
      getMinimumStartDateLocal({
        isEditMode: false,
        todayLocalDate: "2026-04-13",
      })
    ).toBe("2026-04-13");
  });

  it("수정 화면의 시작일 하한선은 최초 시작일이다", () => {
    expect(
      getMinimumStartDateLocal({
        initialStartDateLocal: "2026-04-06",
        isEditMode: true,
        todayLocalDate: "2026-04-13",
      })
    ).toBe("2026-04-06");
  });

  it("하한선보다 과거 날짜를 고르면 하한선으로 보정한다", () => {
    expect(normalizeStartDateSelection("2026-04-01", "2026-04-06")).toBe(
      "2026-04-06"
    );
  });

  it("하한선 이후 날짜는 그대로 유지한다", () => {
    expect(normalizeStartDateSelection("2026-04-20", "2026-04-06")).toBe(
      "2026-04-20"
    );
  });

  it("weekly 시작일과 첫 알림일이 다르면 보조 문구를 만든다", () => {
    expect(
      getFirstReminderHelperText({
        intervalValue: "",
        recurrenceType: "weekly",
        startDateLocal: "2026-04-22",
        weekdayMask: [5],
      })
    ).toBe("첫 알림일은 4월 24일 금요일입니다.");
  });

  it("weekly 시작일과 첫 알림일이 같으면 보조 문구를 숨긴다", () => {
    expect(
      getFirstReminderHelperText({
        intervalValue: "",
        recurrenceType: "weekly",
        startDateLocal: "2026-04-24",
        weekdayMask: [5],
      })
    ).toBeNull();
  });

  it("주 단위가 아니면 첫 알림일 보조 문구를 숨긴다", () => {
    expect(
      getFirstReminderHelperText({
        intervalValue: "3",
        recurrenceType: "interval_days",
        startDateLocal: "2026-04-22",
        weekdayMask: [],
      })
    ).toBeNull();
  });

  it("interval_weeks도 주차 간격을 반영해서 보조 문구를 만든다", () => {
    expect(
      getFirstReminderHelperText({
        intervalValue: "2",
        recurrenceType: "interval_weeks",
        startDateLocal: "2026-04-25",
        weekdayMask: [1],
      })
    ).toBe("첫 알림일은 5월 4일 월요일입니다.");
  });
});

describe("recurring item form validation messages", () => {
  it("제목이 없으면 입력 안내 문구를 보여준다", () => {
    expect(getValidationMessages({ title: "   " })).toContain(
      "제목을 입력해 주세요."
    );
  });

  it("직접 설정 간격이 비어 있으면 입력 안내 문구를 보여준다", () => {
    expect(
      getValidationMessages({
        intervalValue: "",
        recurrenceType: "interval_days",
      })
    ).toContain("반복 간격을 입력해 주세요.");
  });

  it("직접 설정 간격이 1보다 작으면 범위 안내 문구를 보여준다", () => {
    expect(
      getValidationMessages({
        intervalValue: "0",
        recurrenceType: "interval_days",
      })
    ).toContain("반복 간격은 1 이상이어야 해요.");
  });

  it("매주 설정에서 요일이 없으면 선택 안내 문구를 보여준다", () => {
    expect(
      getValidationMessages({
        recurrenceType: "weekly",
        weekdayMask: [],
      })
    ).toContain("반복할 요일을 선택해 주세요.");
  });

  it("지원하지 않는 반복 설정의 완료일 기준은 옵션 안내 문구를 보여준다", () => {
    expect(
      getValidationMessages({
        anchorType: "completion_based",
        recurrenceType: "weekly",
        weekdayMask: [1],
      })
    ).toContain("완료일 기준은 이 반복 설정에서 사용할 수 없어요.");
  });

  it("사용자 문구에 내부 필드명과 저장 형식을 노출하지 않는다", () => {
    const messages = [
      ...getValidationMessages({
        intervalValue: "1",
        recurrenceType: "daily",
      }),
      ...getValidationMessages({
        reminderTimeLocal: "bad-time",
        startDateLocal: "bad-date",
      }),
      ...getValidationMessages({
        recurrenceType: "weekly",
        weekdayMask: [7],
      }),
      ...getValidationMessages({
        anchorType: "completion_based",
        recurrenceType: "weekly",
        weekdayMask: [1],
      }),
    ].join(" ");

    expect(messages).not.toMatch(
      /intervalValue|weekdayMask|completion_based|HH:mm|YYYY-MM-DD/
    );
  });
});

describe("recurring item form color options", () => {
  it("일정 색상 선택지는 정해진 7개 한국어 라벨만 제공한다", () => {
    expect(
      recurringItemColorOptions.map((option) => ({
        label: option.label,
        value: option.value,
      }))
    ).toEqual([
      { label: "빨강", value: "red" },
      { label: "주황", value: "orange" },
      { label: "노랑", value: "yellow" },
      { label: "초록", value: "green" },
      { label: "파랑", value: "blue" },
      { label: "남색", value: "indigo" },
      { label: "보라", value: "purple" },
    ]);
  });
});

describe("recurring item form draft", () => {
  it("신규 일정 draft는 기본 일정 색상 red를 가진다", () => {
    const draft = toDraft(
      {
        ...createDefaultFormState(),
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-06",
        title: "물 마시기",
      },
      "Asia/Seoul"
    );

    expect(draft.colorKey).toBe("red");
  });

  it("선택한 일정 색상 key를 draft에 반영한다", () => {
    const draft = toDraft(
      {
        ...createDefaultFormState(),
        colorKey: "purple",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-06",
        title: "물 마시기",
      },
      "Asia/Seoul"
    );

    expect(draft.colorKey).toBe("purple");
  });

  it("수정 화면 form state는 저장된 일정 색상 key를 유지한다", () => {
    const item: RecurringItem = {
      anchorType: "fixed",
      category: null,
      colorKey: "green",
      createdAt: "2026-05-06T00:00:00.000Z",
      description: null,
      id: "item-1",
      intervalValue: null,
      isArchived: false,
      notificationsEnabled: true,
      recurrenceType: "daily",
      reminderTimeLocal: "09:00",
      startDateLocal: "2026-05-06",
      timezone: "Asia/Seoul",
      title: "물 마시기",
      updatedAt: "2026-05-06T00:00:00.000Z",
      userId: "user-1",
      weekdayMask: null,
    };

    expect(toFormState(item).colorKey).toBe("green");
  });
});
