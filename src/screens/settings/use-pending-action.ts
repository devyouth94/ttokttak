import { useState } from "react";

export function usePendingAction<Action extends string>() {
  const [pendingAction, setPendingAction] = useState<Action | null>(null);

  async function runAction(
    action: Action,
    task: () => Promise<void>
  ): Promise<void> {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);

    try {
      await task();
    } finally {
      setPendingAction(null);
    }
  }

  return { pendingAction, runAction };
}
