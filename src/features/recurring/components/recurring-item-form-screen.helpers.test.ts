import {
  createDefaultFormState,
  createRecurringItemFormSchema,
  getFirstReminderHelperText,
  getIosPickerChangeHandler,
  getMinimumEndDateLocal,
  getMinimumStartDateLocal,
  getNextEndDateDisabledFormState,
  getNextEndDateEnabledFormState,
  getNextRecurrenceFormState,
  getNextStartDateFormState,
  getRecurringItemFormEndDateControlState,
  getRecurringItemFormFirstErrorTarget,
  normalizeStartDateSelection,
  recurringItemColorOptions,
  recurringItemFormSchema,
  type RecurringItemFormValues,
  toDraft,
  toFormState,
} from "~/features/recurring/components/recurring-item-form-screen.helpers";
import { type RecurringItem } from "~/features/recurring/domain/types";

function getValidationMessages(
  overrides: Partial<RecurringItemFormValues>,
  options: {
    isEditMode?: boolean;
    todayLocalDate?: string;
  } = {}
): string[] {
  const schema =
    options.todayLocalDate || options.isEditMode !== undefined
      ? createRecurringItemFormSchema({
          isEditMode: options.isEditMode ?? false,
          todayLocalDate: options.todayLocalDate ?? "2026-05-06",
        })
      : recurringItemFormSchema;
  const result = schema.safeParse({
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
    const item: RecurringItem = {
      anchorType: "fixed",
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

  it("수정 화면 form state는 저장된 종료일을 유지한다", () => {
    const item: RecurringItem = {
      anchorType: "fixed",
      colorKey: "green",
      createdAt: "2026-05-06T00:00:00.000Z",
      description: null,
      endDateLocal: "2026-05-10",
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

    expect(toFormState(item).endDateLocal).toBe("2026-05-10");
  });
});

describe("recurring item form end date state", () => {
  it("한 번 일정에서는 종료일 control을 숨긴다", () => {
    expect(
      getRecurringItemFormEndDateControlState({
        endDateLocal: "2026-05-10",
        recurrenceType: "once",
      })
    ).toEqual({
      displayValue: null,
      isEnabled: false,
      isVisible: false,
    });
  });

  it("반복 일정에서 종료일이 없으면 switch만 보이고 날짜 값은 숨긴다", () => {
    expect(
      getRecurringItemFormEndDateControlState({
        endDateLocal: null,
        recurrenceType: "daily",
      })
    ).toEqual({
      displayValue: null,
      isEnabled: false,
      isVisible: true,
    });
  });

  it("반복 일정에서 종료일이 있으면 switch와 날짜 값을 함께 보여준다", () => {
    expect(
      getRecurringItemFormEndDateControlState({
        endDateLocal: "2026-05-10",
        recurrenceType: "daily",
      })
    ).toEqual({
      displayValue: "2026년 5월 10일",
      isEnabled: true,
      isVisible: true,
    });
  });

  it("생성 화면의 종료일 하한선은 시작일이다", () => {
    expect(
      getMinimumEndDateLocal({
        isEditMode: false,
        startDateLocal: "2026-05-06",
        todayLocalDate: "2026-05-01",
      })
    ).toBe("2026-05-06");
  });

  it("수정 화면의 종료일 하한선은 오늘이다", () => {
    expect(
      getMinimumEndDateLocal({
        isEditMode: true,
        startDateLocal: "2026-05-06",
        todayLocalDate: "2026-05-10",
      })
    ).toBe("2026-05-10");
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

  it("수정 화면에서 종료일 switch를 켜면 오늘을 기본값으로 사용한다", () => {
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
});

describe("recurring item form picker routing", () => {
  it("iOS 시작일 picker 변경은 시작일 handler로 전달한다", () => {
    const onStartDateChange = jest.fn();
    const onEndDateChange = jest.fn();
    const onTimeChange = jest.fn();
    const event = { type: "set" } as never;
    const selectedDate = new Date("2026-05-10T00:00:00.000Z");

    getIosPickerChangeHandler("date", "startDate", {
      onEndDateChange,
      onStartDateChange,
      onTimeChange,
    })(event, selectedDate);

    expect(onStartDateChange).toHaveBeenCalledWith(event, selectedDate);
    expect(onEndDateChange).not.toHaveBeenCalled();
    expect(onTimeChange).not.toHaveBeenCalled();
  });

  it("iOS 종료일 picker 변경은 종료일 handler로 전달한다", () => {
    const onStartDateChange = jest.fn();
    const onEndDateChange = jest.fn();
    const onTimeChange = jest.fn();
    const event = { type: "set" } as never;
    const selectedDate = new Date("2026-05-10T00:00:00.000Z");

    getIosPickerChangeHandler("date", "endDate", {
      onEndDateChange,
      onStartDateChange,
      onTimeChange,
    })(event, selectedDate);

    expect(onEndDateChange).toHaveBeenCalledWith(event, selectedDate);
    expect(onStartDateChange).not.toHaveBeenCalled();
    expect(onTimeChange).not.toHaveBeenCalled();
  });

  it("iOS 시간 picker 변경은 시간 handler로 전달한다", () => {
    const onStartDateChange = jest.fn();
    const onEndDateChange = jest.fn();
    const onTimeChange = jest.fn();
    const event = { type: "set" } as never;
    const selectedDate = new Date("2026-05-10T09:00:00.000Z");

    getIosPickerChangeHandler("time", null, {
      onEndDateChange,
      onStartDateChange,
      onTimeChange,
    })(event, selectedDate);

    expect(onTimeChange).toHaveBeenCalledWith(event, selectedDate);
    expect(onStartDateChange).not.toHaveBeenCalled();
    expect(onEndDateChange).not.toHaveBeenCalled();
  });
});

describe("recurring item form error target", () => {
  it("종료일 오류는 schedule 섹션으로 이동한다", () => {
    expect(
      getRecurringItemFormFirstErrorTarget({
        endDate: "종료일을 확인해 주세요.",
      })
    ).toBe("schedule");
  });
});
