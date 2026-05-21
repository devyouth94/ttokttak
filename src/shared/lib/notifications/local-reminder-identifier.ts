const LOCAL_REMINDER_IDENTIFIER_PREFIX = "ttokttak:reminder";

export type LocalReminderIdentifierParts = {
  identifier: string;
  itemId: string;
  scheduledAtUtc: string;
};

export function createLocalReminderIdentifier(params: {
  itemId: string;
  scheduledAtUtc: string;
  userId: string;
}): string {
  const { itemId, scheduledAtUtc, userId } = params;

  return `${LOCAL_REMINDER_IDENTIFIER_PREFIX}:${userId}:${itemId}:${scheduledAtUtc}`;
}

export function parseLocalReminderIdentifier(
  identifier: string,
  userId: string
): LocalReminderIdentifierParts | null {
  const userPrefix = `${LOCAL_REMINDER_IDENTIFIER_PREFIX}:${userId}:`;

  if (!identifier.startsWith(userPrefix)) {
    return null;
  }

  const remainder = identifier.slice(userPrefix.length);
  const itemIdSeparatorIndex = remainder.indexOf(":");

  if (itemIdSeparatorIndex < 1) {
    return null;
  }

  const itemId = remainder.slice(0, itemIdSeparatorIndex);
  const scheduledAtUtc = remainder.slice(itemIdSeparatorIndex + 1);

  if (!itemId || !scheduledAtUtc) {
    return null;
  }

  return {
    identifier,
    itemId,
    scheduledAtUtc,
  };
}

export function isTtokttakLocalReminderIdentifier(identifier: string): boolean {
  return identifier.startsWith(`${LOCAL_REMINDER_IDENTIFIER_PREFIX}:`);
}
