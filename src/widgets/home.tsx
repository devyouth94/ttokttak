import type { DeviceSyncInput } from "~/device-sync-session";

/** iOS가 아닌 플랫폼에는 홈 화면 위젯이 없다. */
export function applyHomeWidget(input: DeviceSyncInput | null): void {
  void input;
}
