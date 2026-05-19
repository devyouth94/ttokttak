# Local Notification Privacy Verification

## Summary

2026-05-07 기준 일정 알림은 기기 로컬 알림을 기본 경로로 사용한다.

이 검증은 strict E2EE 보장을 의미하지 않는다. 서버에는 일정 제목과 설명의 ciphertext, encryption metadata, wrapped content key가 남는다. 목표는 개발자나 운영자가 Supabase 일반 조회, 원격 푸시 payload, 서버 로그, Sentry event에서 일정 제목과 설명의 평문을 보지 못하게 하는 것이다.

## Automated Checks

로컬 테스트는 아래 회귀를 확인한다.

- `notification-privacy-regression.test.ts`
  - 앱 코드 경로에 원격 푸시 token 등록 API가 없는지 확인한다.
  - 앱 코드 경로가 `device_push_tokens`, `notification_delivery_jobs`, `notification_delivery_attempts`, `notification_inbox_items`를 참조하지 않는지 확인한다.
  - 앱 코드 경로가 `push-delivery-worker`를 참조하지 않는지 확인한다.
- `sentry-sanitizer.test.ts`
  - `title`, `description`, `decryptedTitle`, `decryptedDescription`, push payload, token 계열 field를 Sentry event에서 마스킹한다.
  - local notification diagnostics처럼 count 중심의 비표시 값은 유지한다.
- `local-notification-sync.test.ts`
  - 로컬 알림 content는 제목과 예정 시각만 사용한다.
  - 설명은 로컬 알림 content와 sync diagnostics에 들어가지 않는다.
  - diagnostics는 `candidateCount`, `omittedDistantCount`, `scheduledCount`만 검증한다.
- `notification-sync-lifecycle.test.ts`
  - 세션 복원 뒤 현재 기기 local notification 전체 sync가 실행되는 경로를 확인한다.
  - 알림 tap 처리 뒤 현재 기기 local notification 전체 sync가 실행되는 경로를 확인한다.

## Supabase Check

Supabase MCP로 `afsulksejxywonxulary` 프로젝트를 확인했다.

- `device_push_tokens`: 없음
- `notification_delivery_jobs`: 없음
- `notification_delivery_attempts`: 없음
- `notification_inbox_items`: 없음
- `invoke_push_delivery_worker()`: 없음
- `upsert_notification_delivery_jobs(jsonb)`: 없음
- `cancel_notification_delivery_jobs(uuid[], text)`: 없음
- `push-delivery-worker-every-minute` cron: 없음
- Edge Functions: 없음

MCP에는 Edge Function 삭제 도구가 없어, 조회로 잔존을 확인한 뒤 Supabase CLI로 `push-delivery-worker`를 삭제하고 MCP로 재확인했다.

## Simulator Smoke Test

iOS Simulator에서 실기기 전 사전 확인을 실행했다.

- 기기: iPhone SE (2nd generation), iOS 26.4
- 빌드: `pnpm ios:compact`
- 계정: 기존 로그인 세션
- 권한 상태: 앱 설정 화면 기준 `허용됨`
- 생성 일정: `sim notification later`
- 알림 시각: 오전 2:16
- 결과: 예정 시각에 OS local notification 도착
- 알림 표시 관찰: 사용자가 오전 2:16에 도착을 확인했다.
- 알림 tap routing: 현재 기준은 배너를 탭해 홈으로 이동하는 것이다.
- 에이전트 관찰 한계: 에이전트는 오전 2:17에 화면을 다시 확인해 배너 순간 관찰은 놓쳤다.

시뮬레이터 중 발견한 문제도 함께 수정했다.

- iOS SecureStore key는 영문/숫자, `.`, `-`, `_`만 허용한다.
- 기존 key 포맷 `ttokttak:user-content-key:v1:{userId}`는 iOS 저장 시 실패했다.
- key 포맷을 `ttokttak.user-content-key.v1.{userId}`로 변경했다.
- 회귀 방지를 위해 SecureStore key 포맷 테스트를 추가했다.

## Device Smoke Test

실기기 smoke test는 iOS와 Android 각각에서 실행한다.

1. 앱을 새로 설치하거나 앱 데이터를 초기화한다.
2. 로그인한다.
3. 알림 권한을 허용한다.
4. 2분 뒤 울릴 단발 일정을 만든다.
5. 앱을 백그라운드로 보낸다.
6. 예정 시각에 OS local notification이 표시되는지 확인한다.
7. 알림 제목이 일정 제목인지 확인한다.
8. 알림 본문이 `오후 9:00` 같은 예정 시각만 포함하는지 확인한다.
9. 설명/메모가 알림에 표시되지 않는지 확인한다.
10. 알림을 탭해 홈으로 이동하는지 확인한다.
11. 앱으로 돌아온 뒤 pending local notification sync가 다시 실행되어 중복 알림이 생기지 않는지 확인한다.
12. 같은 계정으로 앱을 종료 후 재시작하고 pending local notification이 유지/재계산되는지 확인한다.

권한 거부 flow는 별도로 확인한다.

1. 알림 권한을 거부한다.
2. 알림이 켜진 일정을 만든다.
3. 앱이 일정을 저장하되 local notification 예약을 시도하지 않는지 확인한다.
4. 설정 화면이 권한 꺼짐 상태를 보여주는지 확인한다.
5. 시스템 설정에서 권한을 허용한 뒤 앱으로 돌아온다.
6. 권한 상태가 갱신되고 다음 sync에서 local notification이 예약되는지 확인한다.

## When Device Test Is Not Run

실기기 확인을 실행하지 못하면 PR이나 검증 기록에 아래 내용을 남긴다.

- 미실행 플랫폼: iOS, Android, 또는 둘 다
- 미실행 사유: 기기 없음, 개발 빌드 없음, 계정/권한 준비 안 됨 등
- 대신 실행한 검증: unit test, typecheck, lint, Supabase MCP 확인
- 남은 위험: OS 권한 prompt, 실제 알림 표시, 알림 tap routing, 앱 재시작 뒤 pending notification 유지 여부
- 재검증 조건: 실기기와 development build 준비 후 위 smoke test 재실행
