import type {
  RecurringItemsPersistence,
  StoredRecurringItem,
} from "~/features/recurring/repositories/recurring-items-persistence";

type AwaitableQuery<T> = Record<string, jest.Mock> & {
  then: PromiseLike<T>["then"];
};

/**
 * Supabase query builder처럼 체이닝 가능하고 await도 가능한 테스트 더블을 만든다.
 */
export function createAwaitableQuery<T>(
  result: T,
  chainMethods: string[]
): AwaitableQuery<T> {
  const query = {} as AwaitableQuery<T>;

  for (const methodName of chainMethods) {
    query[methodName] = jest.fn(() => query);
  }

  query.then = ((onfulfilled) =>
    Promise.resolve(
      onfulfilled ? onfulfilled(result) : result
    )) as PromiseLike<T>["then"];

  return query;
}

export function createStoredRecurringItemFixture(
  overrides: Partial<StoredRecurringItem> = {}
): StoredRecurringItem {
  const item: StoredRecurringItem = {
    category: null,
    colorKey: "blue",
    contentEncryptionMetadata: {
      algorithm: "test",
    },
    contentKeyVersion: 1,
    createdAt: "2026-05-06T00:00:00.000Z",
    descriptionCiphertext: "encrypted-description",
    id: "item-1",
    isArchived: false,
    scheduleVersions: [
      {
        anchorType: "fixed",
        createdAt: "2026-05-06T00:00:00.000Z",
        effectiveFromUtc: "2026-05-05T15:00:00.000Z",
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
    startDateLocal: "2026-05-06",
    titleCiphertext: "encrypted-title",
    updatedAt: "2026-05-06T00:00:00.000Z",
    userId: "user-1",
  };

  return {
    ...item,
    ...overrides,
    scheduleVersions: overrides.scheduleVersions ?? item.scheduleVersions,
  };
}

export function createRecurringItemsPersistenceDouble(
  item: StoredRecurringItem = createStoredRecurringItemFixture()
): jest.Mocked<RecurringItemsPersistence> {
  return {
    archiveItem: jest.fn().mockResolvedValue(undefined),
    createItemWithInitialVersion: jest.fn().mockResolvedValue(item.id),
    getItemById: jest.fn().mockResolvedValue(item),
    listCompletionLogsForItem: jest.fn().mockResolvedValue([]),
    listItems: jest.fn().mockResolvedValue([item]),
    updateItemWithEditPolicy: jest.fn().mockResolvedValue(undefined),
  };
}
