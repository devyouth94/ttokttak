# Device Local Notifications

일정 알림은 원격 푸시가 아니라 **기기 로컬 알림**을 기본 경로로 사용한다. 일정 제목과 설명은 개인 생활 패턴을 드러내는 데이터이므로 서버와 푸시 provider가 표시 문구를 알 수 없는 방향을 우선한다.

원격 푸시는 나중에 알림 신뢰도 보완이 필요할 때만 일반 문구 fallback으로 검토한다. 이 경우에도 실제 일정 제목과 설명은 payload에 싣지 않고, `itemId`와 `scheduledAtUtc` 같은 routing 값만 사용한다.
