export class ScheduleNotFoundError extends Error {
  constructor() {
    super("반복 항목을 찾을 수 없습니다.");
    this.name = "ScheduleNotFoundError";
  }
}

export class ScheduleContentUnrecoverableError extends Error {
  constructor(message = "일정 내용을 복구할 수 없습니다.") {
    super(message);
    this.name = "ScheduleContentUnrecoverableError";
  }
}
