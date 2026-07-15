import { createRecurringItemFixture } from "~/entities/schedule/testing";

import {
  createDefaultFormState,
  createRecurringItemFormSchema,
  formatDateToLocalDate,
  formatDateToLocalTime,
  getMinimumEndDateLocal,
  getMinimumStartDateLocal,
  getNextEndDateDisabledFormState,
  getNextEndDateEnabledFormState,
  getNextEndDateSelectionFormState,
  getNextRecurrenceFormState,
  getNextStartDateFormState,
  getNextStartDateSelectionFormState,
  getSanitizedIntervalInput,
  getScheduleFormIosPickerValue,
  getScheduleFormPickerDates,
  normalizeStartDateSelection,
  type RecurringItemFormValues,
  toDraft,
  toFormState,
} from "./schedule-form-state";

function getValidationMessages(
  overrides: Partial<RecurringItemFormValues>,
  options: {
    isEditMode?: boolean;
    language?: "en" | "ko";
    todayLocalDate?: string;
  } = {}
): string[] {
  const schema = createRecurringItemFormSchema({
    isEditMode: options.isEditMode ?? false,
    language: options.language ?? "ko",
    timezone: "Asia/Seoul",
    todayLocalDate: options.todayLocalDate ?? "2026-05-06",
  });
  const result = schema.safeParse({
    ...createDefaultFormState(),
    ...overrides,
  });

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => issue.message);
}

describe("recurring item form start date state", () => {
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

  it("직접 설정 간격은 숫자만 허용한다", () => {
    expect(
      getValidationMessages({
        intervalValue: "1abc",
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
      ...getValidationMessages({
        endDateLocal: "bad-date",
      }),
    ].join(" ");

    expect(messages).not.toMatch(
      /endDateLocal|intervalValue|weekdayMask|completion_based|HH:mm|YYYY-MM-DD/
    );
  });

  it("생성 시 종료일은 시작일보다 빠를 수 없다", () => {
    expect(
      getValidationMessages({
        endDateLocal: "2026-05-05",
        startDateLocal: "2026-05-06",
      })
    ).toContain("종료일은 시작일 이후로 선택해 주세요.");
  });

  it("수정 시 종료일은 오늘보다 빠를 수 없다", () => {
    expect(
      getValidationMessages(
        {
          endDateLocal: "2026-05-09",
          startDateLocal: "2026-05-06",
        },
        {
          isEditMode: true,
          todayLocalDate: "2026-05-10",
        }
      )
    ).toContain("종료일은 오늘 이후로 선택해 주세요.");
  });

  it("종료일이 있으면 시작일과 종료일 사이에 최소 1개 occurrence가 있어야 한다", () => {
    expect(
      getValidationMessages({
        endDateLocal: "2026-05-07",
        recurrenceType: "weekly",
        startDateLocal: "2026-05-06",
        weekdayMask: [5],
      })
    ).toContain("선택한 기간 안에 알림일이 없어요.");
  });

  it("English 모드에서는 validation 문구를 English로 보여준다", () => {
    expect(
      getValidationMessages(
        {
          anchorType: "completion_based",
          endDateLocal: "2026-05-05",
          intervalValue: "",
          recurrenceType: "interval_days",
          startDateLocal: "2026-05-06",
          title: "   ",
        },
        {
          language: "en",
        }
      )
    ).toEqual(
      expect.arrayContaining([
        "Enter a title.",
        "Enter a repeat interval.",
        "Choose an end date after the start date.",
      ])
    );
  });
});

describe("recurring item form draft", () => {
  it("종료일 없음은 form state와 draft에서 null로 표현한다", () => {
    const formState = createDefaultFormState();
    const draft = toDraft(
      {
        ...formState,
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-06",
        title: "물 마시기",
      },
      "Asia/Seoul"
    );

    expect(formState.endDateLocal).toBeNull();
    expect(draft.endDateLocal).toBeNull();
  });

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
    const item = createRecurringItemFixture({
      colorKey: "green",
      createdAt: "2026-05-06T00:00:00.000Z",
      description: null,
      id: "item-1",
      isArchived: false,
      startDateLocal: "2026-05-06",
      timezone: "Asia/Seoul",
      title: "물 마시기",
      updatedAt: "2026-05-06T00:00:00.000Z",
      userId: "user-1",
    });

    expect(toFormState(item).colorKey).toBe("green");
  });

  it("수정 화면 form state는 저장된 종료일을 유지한다", () => {
    const item = createRecurringItemFixture({
      colorKey: "green",
      createdAt: "2026-05-06T00:00:00.000Z",
      description: null,
      endDateLocal: "2026-05-10",
      id: "item-1",
      isArchived: false,
      startDateLocal: "2026-05-06",
      timezone: "Asia/Seoul",
      title: "물 마시기",
      updatedAt: "2026-05-06T00:00:00.000Z",
      userId: "user-1",
    });

    expect(toFormState(item).endDateLocal).toBe("2026-05-10");
  });
});

describe("recurring item form end date state", () => {
  it("생성 화면의 종료일 하한선은 시작일이다", () => {
    expect(
      getMinimumEndDateLocal({
        isEditMode: false,
        startDateLocal: "2026-05-06",
        todayLocalDate: "2026-05-01",
      })
    ).toBe("2026-05-06");
  });

  it("수정 화면의 종료일 하한선은 오늘이 시작일보다 늦으면 오늘이다", () => {
    expect(
      getMinimumEndDateLocal({
        isEditMode: true,
        startDateLocal: "2026-05-06",
        todayLocalDate: "2026-05-10",
      })
    ).toBe("2026-05-10");
  });

  it("수정 화면의 종료일 하한선은 미래 시작일보다 빠를 수 없다", () => {
    expect(
      getMinimumEndDateLocal({
        isEditMode: true,
        startDateLocal: "2026-06-01",
        todayLocalDate: "2026-05-10",
      })
    ).toBe("2026-06-01");
  });

  it("생성 화면에서 종료일 switch를 켜면 시작일을 기본값으로 사용한다", () => {
    expect(
      getNextEndDateEnabledFormState(
        {
          ...createDefaultFormState(),
          startDateLocal: "2026-05-06",
        },
        {
          isEditMode: false,
          todayLocalDate: "2026-05-01",
        }
      ).endDateLocal
    ).toBe("2026-05-06");
  });

  it("수정 화면에서 오늘이 시작일보다 늦으면 종료일 switch 기본값은 오늘이다", () => {
    expect(
      getNextEndDateEnabledFormState(
        {
          ...createDefaultFormState(),
          startDateLocal: "2026-05-06",
        },
        {
          isEditMode: true,
          todayLocalDate: "2026-05-10",
        }
      ).endDateLocal
    ).toBe("2026-05-10");
  });

  it("수정 화면에서 미래 시작 일정의 종료일 switch를 켜면 시작일을 기본값으로 사용한다", () => {
    expect(
      getNextEndDateEnabledFormState(
        {
          ...createDefaultFormState(),
          startDateLocal: "2026-06-01",
        },
        {
          isEditMode: true,
          todayLocalDate: "2026-05-10",
        }
      ).endDateLocal
    ).toBe("2026-06-01");
  });

  it("종료일 switch를 끄면 종료일 값을 즉시 제거한다", () => {
    expect(
      getNextEndDateDisabledFormState({
        ...createDefaultFormState(),
        endDateLocal: "2026-05-10",
      }).endDateLocal
    ).toBeNull();
  });

  it("반복 유형을 한 번으로 바꾸면 종료일이 제거된다", () => {
    expect(
      getNextRecurrenceFormState(
        {
          ...createDefaultFormState(),
          endDateLocal: "2026-05-10",
          recurrenceType: "daily",
        },
        "once"
      ).endDateLocal
    ).toBeNull();
  });

  it("한 번에서 반복 일정으로 바꾸면 종료일은 꺼진 상태로 시작한다", () => {
    expect(
      getNextRecurrenceFormState(
        {
          ...createDefaultFormState(),
          endDateLocal: "2026-05-10",
          recurrenceType: "once",
        },
        "daily"
      ).endDateLocal
    ).toBeNull();
  });

  it("반복 유형을 반복끼리 바꿀 때는 종료일을 유지한다", () => {
    expect(
      getNextRecurrenceFormState(
        {
          ...createDefaultFormState(),
          endDateLocal: "2026-05-10",
          recurrenceType: "daily",
        },
        "weekly"
      ).endDateLocal
    ).toBe("2026-05-10");
  });

  it("생성 중 시작일을 종료일보다 뒤로 바꾸면 종료일을 새 시작일로 보정한다", () => {
    expect(
      getNextStartDateFormState(
        {
          ...createDefaultFormState(),
          endDateLocal: "2026-05-10",
          startDateLocal: "2026-05-06",
        },
        "2026-05-12"
      ).endDateLocal
    ).toBe("2026-05-12");
  });

  it("수정 중 시작일 선택 event는 form state를 바꾸지 않는다", () => {
    const current = {
      ...createDefaultFormState(),
      startDateLocal: "2026-05-06",
    };

    expect(
      getNextStartDateSelectionFormState(current, "2026-05-12", {
        isEditMode: true,
        minimumStartDateLocal: "2026-05-06",
      })
    ).toBe(current);
  });

  it("생성 중 시작일 선택 event는 하한선으로 보정한 뒤 연쇄 상태를 만든다", () => {
    const next = getNextStartDateSelectionFormState(
      {
        ...createDefaultFormState(),
        endDateLocal: "2026-05-10",
        startDateLocal: "2026-05-06",
      },
      "2026-05-01",
      {
        isEditMode: false,
        minimumStartDateLocal: "2026-05-08",
      }
    );

    expect(next.startDateLocal).toBe("2026-05-08");
    expect(next.endDateLocal).toBe("2026-05-10");
  });

  it("종료일 선택 event는 수정 화면 하한선으로 보정한다", () => {
    expect(
      getNextEndDateSelectionFormState(
        {
          ...createDefaultFormState(),
          startDateLocal: "2026-05-06",
        },
        "2026-05-07",
        {
          isEditMode: true,
          todayLocalDate: "2026-05-10",
        }
      ).endDateLocal
    ).toBe("2026-05-10");
  });

  it("직접 입력 반복 간격 event는 숫자만 form state로 넘긴다", () => {
    expect(getSanitizedIntervalInput("1주 2회")).toBe("12");
  });

  it("picker Date 값은 local date와 time form state에서 파생한다", () => {
    const pickerDates = getScheduleFormPickerDates({
      endDateLocal: "2026-05-07",
      minimumEndDateLocal: "2026-05-10",
      minimumStartDateLocal: "2026-05-06",
      reminderTimeLocal: "09:30",
      startDateLocal: "2026-05-01",
    });

    expect(formatDateToLocalDate(pickerDates.selectedEndDate)).toBe(
      "2026-05-10"
    );
    expect(formatDateToLocalDate(pickerDates.selectedStartDate)).toBe(
      "2026-05-06"
    );
    expect(formatDateToLocalTime(pickerDates.selectedReminderTime)).toBe(
      "09:30"
    );
  });

  it("iOS picker 값은 mode와 대상 날짜에 맞는 Date를 고른다", () => {
    expect(
      formatDateToLocalDate(
        getScheduleFormIosPickerValue({
          datePickerTarget: "endDate",
          endDateLocal: "2026-05-12",
          minimumEndDateLocal: "2026-05-10",
          minimumStartDateLocal: "2026-05-06",
          mode: "date",
          reminderTimeLocal: "09:30",
          startDateLocal: "2026-05-06",
        })
      )
    ).toBe("2026-05-12");

    expect(
      formatDateToLocalTime(
        getScheduleFormIosPickerValue({
          datePickerTarget: null,
          endDateLocal: null,
          minimumEndDateLocal: "2026-05-10",
          minimumStartDateLocal: "2026-05-06",
          mode: "time",
          reminderTimeLocal: "09:30",
          startDateLocal: "2026-05-06",
        })
      )
    ).toBe("09:30");
  });
});
