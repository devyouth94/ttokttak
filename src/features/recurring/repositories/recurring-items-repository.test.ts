import {
  archiveRecurringItem,
  createRecurringItem,
  getRecurringItemById,
  listRecurringItems,
  updateRecurringItem,
} from "~/features/recurring/repositories/recurring-items-repository";
import {
  createRecurringItemsPersistenceDouble,
  createStoredRecurringItemFixture,
} from "~/features/recurring/repositories/repository-test-helpers";

const contentCipher = {
  decryptRecurringItemContent: jest.fn().mockResolvedValue({
    title: "물 마시기",
    description: "하루 8잔",
  }),
  encryptRecurringItemContent: jest.fn().mockResolvedValue({
    titleCiphertext: "encrypted-title",
    descriptionCiphertext: "encrypted-description",
    keyVersion: 1,
    metadata: {
      algorithm: "test",
    },
  }),
};

describe("recurring items repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("신규 일정 생성은 제목과 설명을 암호화해서 저장하고 조회 시 복호화된 값을 제공한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    const item = await createRecurringItem(
      {
        anchorType: "fixed",
        description: "하루 8잔",
        intervalValue: null,
        isArchived: false,
        notificationsEnabled: true,
        recurrenceType: "daily",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-06",
        timezone: "Asia/Seoul",
        title: "물 마시기",
        userId: "user-1",
        weekdayMask: null,
      },
      { contentCipher, persistence }
    );

    expect(persistence.createItemWithInitialVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        contentEncryptionMetadata: { algorithm: "test" },
        contentKeyVersion: 1,
        descriptionCiphertext: "encrypted-description",
        titleCiphertext: "encrypted-title",
      })
    );
    expect(item.title).toBe("물 마시기");
    expect(item.description).toBe("하루 8잔");
  });

  it("일정 목록은 암호문 row를 복호화한 제목과 설명으로 제공한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    const items = await listRecurringItems({
      contentCipher,
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(contentCipher.decryptRecurringItemContent).toHaveBeenCalledWith({
      descriptionCiphertext: "encrypted-description",
      keyVersion: 1,
      metadata: { algorithm: "test" },
      titleCiphertext: "encrypted-title",
      userId: "user-1",
    });
    expect(items[0]?.title).toBe("물 마시기");
    expect(items[0]?.description).toBe("하루 8잔");
  });

  it("일정 목록 조회는 보관 일정 제외 의미를 persistence에 전달한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    await listRecurringItems({
      contentCipher,
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(persistence.listItems).toHaveBeenCalledWith({
      includeArchived: false,
      limit: 500,
      userId: "user-1",
    });
  });

  it("복호화 실패한 일정도 목록에서 fallback 제목과 빈 설명으로 제공한다", async () => {
    const brokenContentCipher = {
      ...contentCipher,
      decryptRecurringItemContent: jest
        .fn()
        .mockRejectedValue(new Error("corrupted ciphertext")),
    };
    const persistence = createRecurringItemsPersistenceDouble();

    const items = await listRecurringItems({
      contentCipher: brokenContentCipher,
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("일정 내용을 복구할 수 없어요");
    expect(items[0]?.description).toBeNull();
    expect(items[0]?.contentStatus).toEqual({
      reason: "decryption-failed",
      status: "unrecoverable",
    });
  });

  it.each([
    "corrupted ciphertext",
    "missing content key",
    "unsupported key version",
  ])("복호화 실패 유형 %s도 예외 상태로 분류한다", async (message) => {
    const brokenContentCipher = {
      ...contentCipher,
      decryptRecurringItemContent: jest
        .fn()
        .mockRejectedValue(new Error(message)),
    };
    const persistence = createRecurringItemsPersistenceDouble();

    const item = await getRecurringItemById({
      contentCipher: brokenContentCipher,
      id: "item-1",
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(item.contentStatus?.status).toBe("unrecoverable");
    expect(item.title).toBe("일정 내용을 복구할 수 없어요");
    expect(item.description).toBeNull();
  });

  it("신규 일정 생성은 색상을 명시하지 않아도 기본 일정 색상 red를 저장한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    await createRecurringItem(
      {
        anchorType: "fixed",
        description: null,
        intervalValue: null,
        isArchived: false,
        notificationsEnabled: true,
        recurrenceType: "daily",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-06",
        timezone: "Asia/Seoul",
        title: "물 마시기",
        userId: "user-1",
        weekdayMask: null,
      },
      { contentCipher, persistence }
    );

    expect(persistence.createItemWithInitialVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        colorKey: "red",
      })
    );
  });

  it("신규 일정 생성은 종료일을 초기 schedule version에 저장하고 조회 값으로 제공한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble(
      createStoredRecurringItemFixture({
        scheduleVersions: [
          {
            anchorType: "fixed",
            createdAt: "2026-05-06T00:00:00.000Z",
            effectiveFromUtc: "2026-05-05T15:00:00.000Z",
            endDateLocal: "2026-05-09",
            id: "version-1",
            intervalValue: null,
            itemId: "item-1",
            notificationsEnabled: true,
            recurrenceType: "daily",
            reminderTimeLocal: "09:00:00",
            seedStartDateLocal: "2026-05-06",
            userId: "user-1",
            weekdayMask: null,
          },
        ],
      })
    );

    const item = await createRecurringItem(
      {
        anchorType: "fixed",
        description: null,
        endDateLocal: "2026-05-09",
        intervalValue: null,
        isArchived: false,
        notificationsEnabled: true,
        recurrenceType: "daily",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-06",
        timezone: "Asia/Seoul",
        title: "물 마시기",
        userId: "user-1",
        weekdayMask: null,
      },
      { contentCipher, persistence }
    );

    expect(persistence.createItemWithInitialVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        endDateLocal: "2026-05-09",
      })
    );
    expect(item.scheduleVersions?.[0]?.endDateLocal).toBe("2026-05-09");
  });

  it("한 번 일정 생성은 종료일 입력이 들어와도 null로 저장한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    await createRecurringItem(
      {
        anchorType: "fixed",
        description: null,
        endDateLocal: "2026-05-09",
        intervalValue: null,
        isArchived: false,
        notificationsEnabled: true,
        recurrenceType: "once",
        reminderTimeLocal: "09:00",
        startDateLocal: "2026-05-06",
        timezone: "Asia/Seoul",
        title: "물 마시기",
        userId: "user-1",
        weekdayMask: null,
      },
      { contentCipher, persistence }
    );

    expect(persistence.createItemWithInitialVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        endDateLocal: null,
        recurrenceType: "once",
      })
    );
  });

  it("일정 조회는 저장된 일정 색상 key를 도메인 값으로 제공한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    const item = await getRecurringItemById({
      contentCipher,
      id: "item-1",
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(item.colorKey).toBe("blue");
  });

  it("일정 수정은 변경한 일정 색상 key를 저장 인자로 보존한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    await updateRecurringItem(
      {
        id: "item-1",
        patch: { colorKey: "purple" },
        timezone: "Asia/Seoul",
        userId: "user-1",
      },
      { contentCipher, persistence }
    );

    expect(persistence.updateItemWithEditPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        colorKey: "purple",
      })
    );
  });

  it("종료일 수정은 새 schedule version 저장 인자로 전달한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    await updateRecurringItem(
      {
        id: "item-1",
        patch: { endDateLocal: "2026-05-09" },
        timezone: "Asia/Seoul",
        userId: "user-1",
      },
      { contentCipher, persistence }
    );

    expect(persistence.updateItemWithEditPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        endDateLocal: "2026-05-09",
        hasRuleChanges: true,
      })
    );
  });

  it("종료일 제거도 새 schedule version 저장 인자로 null을 전달한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble(
      createStoredRecurringItemFixture({
        scheduleVersions: [
          {
            anchorType: "fixed",
            createdAt: "2026-05-06T00:00:00.000Z",
            effectiveFromUtc: "2026-05-05T15:00:00.000Z",
            endDateLocal: "2026-05-09",
            id: "version-1",
            intervalValue: null,
            itemId: "item-1",
            notificationsEnabled: true,
            recurrenceType: "daily",
            reminderTimeLocal: "09:00:00",
            seedStartDateLocal: "2026-05-06",
            userId: "user-1",
            weekdayMask: null,
          },
        ],
      })
    );

    await updateRecurringItem(
      {
        id: "item-1",
        patch: { endDateLocal: null },
        timezone: "Asia/Seoul",
        userId: "user-1",
      },
      { contentCipher, persistence }
    );

    expect(persistence.updateItemWithEditPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        endDateLocal: null,
        hasRuleChanges: true,
      })
    );
  });

  it("종료일이 있는 반복 일정을 한 번 일정으로 바꾸면 종료일을 null로 저장한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble(
      createStoredRecurringItemFixture({
        scheduleVersions: [
          {
            anchorType: "fixed",
            createdAt: "2026-05-06T00:00:00.000Z",
            effectiveFromUtc: "2026-05-05T15:00:00.000Z",
            endDateLocal: "2026-05-09",
            id: "version-1",
            intervalValue: null,
            itemId: "item-1",
            notificationsEnabled: true,
            recurrenceType: "daily",
            reminderTimeLocal: "09:00:00",
            seedStartDateLocal: "2026-05-06",
            userId: "user-1",
            weekdayMask: null,
          },
        ],
      })
    );

    await updateRecurringItem(
      {
        id: "item-1",
        patch: { recurrenceType: "once" },
        timezone: "Asia/Seoul",
        userId: "user-1",
      },
      { contentCipher, persistence }
    );

    expect(persistence.updateItemWithEditPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        endDateLocal: null,
        recurrenceType: "once",
      })
    );
  });

  it("일정 수정은 병합한 제목과 설명을 암호화해서 저장한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    await updateRecurringItem(
      {
        id: "item-1",
        patch: {
          description: "저녁 식사 후",
          title: "영양제",
        },
        timezone: "Asia/Seoul",
        userId: "user-1",
      },
      { contentCipher, persistence }
    );

    expect(contentCipher.encryptRecurringItemContent).toHaveBeenCalledWith({
      description: "저녁 식사 후",
      title: "영양제",
      userId: "user-1",
    });
    expect(persistence.updateItemWithEditPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        contentEncryptionMetadata: { algorithm: "test" },
        contentKeyVersion: 1,
        descriptionCiphertext: "encrypted-description",
        titleCiphertext: "encrypted-title",
      })
    );
  });

  it("복호화 실패한 일정은 fallback 내용을 다시 저장하지 않도록 수정할 수 없다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();
    const brokenContentCipher = {
      ...contentCipher,
      decryptRecurringItemContent: jest
        .fn()
        .mockRejectedValue(new Error("missing content key")),
    };

    await expect(
      updateRecurringItem(
        {
          id: "item-1",
          patch: { title: "다시 저장" },
          timezone: "Asia/Seoul",
          userId: "user-1",
        },
        { contentCipher: brokenContentCipher, persistence }
      )
    ).rejects.toThrow("내용을 복구할 수 없는 일정은 수정할 수 없습니다.");
    expect(persistence.updateItemWithEditPolicy).not.toHaveBeenCalled();
  });

  it("상세 조회는 암호문 row를 복호화한 제목과 설명으로 제공한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    const item = await getRecurringItemById({
      contentCipher,
      id: "item-1",
      persistence,
      timezone: "Asia/Seoul",
      userId: "user-1",
    });

    expect(item.title).toBe("물 마시기");
    expect(item.description).toBe("하루 8잔");
  });

  it("일정 삭제는 저장된 일정을 보관 처리한다", async () => {
    const persistence = createRecurringItemsPersistenceDouble();

    await archiveRecurringItem({
      id: "item-1",
      persistence,
      userId: "user-1",
    });

    expect(persistence.archiveItem).toHaveBeenCalledWith({
      id: "item-1",
    });
  });
});
