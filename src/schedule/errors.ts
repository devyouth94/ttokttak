export class ScheduleNotFoundError extends Error {
  constructor() {
    super("반복 항목을 찾을 수 없습니다.");
    this.name = "ScheduleNotFoundError";
  }
}
