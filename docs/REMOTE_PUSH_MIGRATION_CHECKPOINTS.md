# Remote Push Migration Checkpoints

이 문서는 로컬 알림 중심 구조를 직접 APNs + FCM 기반 원격 푸시 구조로 전환하기 위한 실행 체크리스트다.
제품 범위는 `PRODUCT_SPEC.md`를 따른다.
도메인 규칙은 `DOMAIN_LOGIC.md`를 따른다.
상위 구현 순서는 `IMPLEMENTATION_PLAN.md`를 따른다.

## 1. 전환 원칙

- 서버가 발송 기준을 가진다.
- iOS는 APNs 직접 발송을 사용한다.
- Android는 FCM 직접 발송을 사용한다.
- 앱은 푸시 토큰 수집과 등록만 맡는다.
- 서버는 발송 대상 계산, 중복 방지, 발송, 실패 처리를 맡는다.
- 기존 `effective_from_utc` 이후 미래 occurrence만 재조정하는 규칙은 유지한다.
- 기존 로컬 예약 metadata 구조는 최종 구조가 아니다.

## 2. 현재 방향

- 전송 방식: 직접 APNs + FCM
- 대상 플랫폼: iOS + Android 동시
- 빌드 경로: EAS 없이 진행
- 문서 목적: 실행 체크리스트

## 3. Phase 0. 준비 확인

### 내가 할 것

- [ ] Apple Developer 계정 권한을 확인한다.
- [ ] Firebase 프로젝트를 만들 수 있는 권한을 확인한다.
- [ ] 실제 iPhone 테스트 기기를 준비한다.
- [ ] 실제 Android 테스트 기기를 준비한다.
- [ ] 기존 `.p8` 파일이 APNs 용도인지 확인한다.
- [ ] 기존 `.p8` 원본 파일을 보관 중인지 확인한다.

### 네가 할 것

- [ ] 기존 로컬 알림 구조와 원격 푸시 전환 영향 범위를 문서 기준으로 정리한다.
- [ ] 로컬 알림 17~19단계와 원격 푸시 전환의 충돌 지점을 정리한다.

### 완료 체크포인트

- [ ] Apple, Firebase, 테스트 기기 준비 상태를 확인했다.
- [ ] 기존 `.p8` 재사용 가능 여부를 결정했다.

## 4. Phase 1. Apple APNs 준비

### 내가 할 것

- [x] Apple Developer > Certificates, Identifiers & Profiles > Identifiers로 이동한다.
- [x] `com.youngzin.ttokttak` App ID에서 `Push Notifications` capability를 활성화한다.
- [x] Apple Developer > Keys로 이동한다.
- [x] 기존 key에 `Apple Push Notification service`를 추가할지, 새 key를 만들지 결정한다.
- [x] APNs key를 최종 확정한다.
- [x] 아래 값을 안전하게 정리한다.
  - [x] `Key ID`
  - [x] `Team ID`
  - [x] `Bundle ID`
  - [x] `.p8` 파일 보관 경로

### 네가 할 것

- [ ] iOS 토큰 수집 경로를 앱 코드 기준으로 정리한다.
- [ ] APNs 인증 정보가 서버에서 어떻게 사용되는지 문서화한다.
- [ ] iOS 토큰 등록 API 요구사항을 정리한다.

### 완료 체크포인트

- [x] App ID capability가 켜져 있다.
- [x] APNs key를 확정했다.
- [x] 서버에 필요한 APNs 자격 증명 값이 정리됐다.

## 5. Phase 2. Firebase FCM 준비

### 내가 할 것

- [x] Firebase 프로젝트를 생성한다.
- [x] Android 앱 `com.youngzin.ttokttak`를 등록한다.
- [x] `google-services.json`을 다운로드한다.
- [x] FCM 발송용 서비스 계정을 확정한다.
- [x] 서버에서 사용할 서비스 계정 키 또는 권한 부여 방식을 정리한다.

### 네가 할 것

- [ ] Android 토큰 수집 경로를 앱 코드 기준으로 정리한다.
- [ ] Android 토큰 등록 API 요구사항을 정리한다.
- [ ] FCM 인증 정보가 서버에서 어떻게 사용되는지 문서화한다.

### 완료 체크포인트

- [x] Firebase 프로젝트와 Android 앱 등록이 끝났다.
- [x] `google-services.json` 확보가 끝났다.
- [x] 서버 발송용 FCM 권한 준비가 끝났다.

## 6. Phase 3. 앱 토큰 등록 구조

### 내가 할 것

- [x] iOS/Android에서 푸시 권한을 실제 기기에서 확인한다.
- [x] 앱이 발급한 토큰을 서버에 등록할 수 있는지 테스트한다.

### 네가 할 것

- [x] 신규 서버 테이블 또는 스키마 변경안을 정리한다.
  - [x] `devices`는 유지한다.
  - [x] `device_push_tokens`를 추가한다.
- [x] 앱 토큰 수집 시점을 정리한다.
  - [x] 로그인 직후 세션 복원 시 현재 기기 토큰을 등록한다.
  - [x] 권한 허용 직후 현재 기기 토큰을 등록한다.
  - [x] `addPushTokenListener`로 토큰 갱신 시 다시 등록한다.
- [x] 토큰 비활성 처리 시점을 정리한다.
  - [x] 로그아웃 시 현재 기기 토큰을 비활성화한다.
  - [x] 권한 거부 시 현재 기기 활성 토큰을 비활성화한다.
  - [x] 발송 실패로 인한 만료는 서버 발송 단계에서 `delivery-failed`로 비활성화한다.

### 정리 결과

- `devices`
  - 기기 identity와 마지막 활성 시각을 유지한다.
  - 현재 사용자와 현재 기기 연결의 기준 row로 계속 사용한다.
- `device_push_tokens`
  - `device_id + push_provider` 단위로 현재 활성 토큰 1건만 유지한다.
  - `platform`, `push_provider`, `push_token`, `permission_status`, `is_active`, `last_registered_at`을 저장한다.
  - 비활성화 시 `deactivated_at`, `deactivation_reason`을 남긴다.
### 완료 체크포인트

- [x] 토큰 저장 구조가 정리됐다.
- [x] 토큰 등록, 갱신, 비활성 규칙이 정리됐다.
- [x] iOS APNs 토큰이 실제 기기에서 발급됐다.
- [x] Android FCM 토큰이 실제 기기에서 발급됐다.
- [x] 같은 계정으로 iOS/Android 토큰이 서버에 각각 등록됐다.

## 7. Phase 4. 서버 발송 구조

### 내가 할 것

- [ ] 서버 환경변수에 APNs/FCM 자격 증명을 주입할 수 있는지 확인한다.
- [ ] 운영 환경에서 비밀값 보관 방식을 확정한다.

### 네가 할 것

- [x] 서버 발송 흐름을 정리한다.
  - [x] 발송 job 생성
  - [x] 발송 시점 조회
  - [x] APNs 발송
  - [x] FCM 발송
  - [x] 성공/실패 기록
- [x] 중복 방지 키를 정리한다.
- [x] 멀티 디바이스 정책을 정리한다.
  - [x] 기본값은 활성 토큰 전체 발송으로 둔다.
- [x] 실패 재시도와 만료 토큰 정리 규칙을 정리한다.

### 정리 결과

- 서버는 `notification_delivery_jobs`와 `notification_delivery_attempts`를 기준으로 발송 상태를 관리한다.
- job은 occurrence 단위 source row다.
  - `user_id + item_id + notification_kind + item_scheduled_at_utc` 의미를 `dedupe_key`로 고정한다.
  - 같은 occurrence에 대해 중복 job을 만들지 않는다.
- attempt는 token 단위 fan-out 결과 row다.
  - 한 job이 여러 활성 토큰으로 분기될 수 있다.
  - APNs와 FCM 결과를 같은 attempt 모델에 기록한다.
- 발송 worker 흐름은 아래 순서를 따른다.
  1. mutation 또는 재계산 작업이 future occurrence 기준 job을 upsert 한다.
  2. worker가 `status in ('pending', 'retrying')` 이고 `deliver_at_utc <= now()` 인 job을 조회한다.
  3. 조회 시점의 활성 `device_push_tokens`를 읽는다.
  4. iOS + `apns` 토큰은 APNs 직접 발송을 수행한다.
  5. Android + `fcm` 토큰은 FCM 직접 발송을 수행한다.
  6. token별 성공/실패를 attempt row로 남긴다.
  7. job summary 상태를 `succeeded`, `partially-failed`, `failed`, `cancelled` 중 하나로 갱신한다.
- 멀티 디바이스 기본 정책은 활성 토큰 전체 발송이다.
  - 같은 사용자라도 활성 token이 여러 개면 모두 발송한다.
  - 디바이스별 성공/실패는 attempt row에서 따로 본다.
- 토큰 선택 규칙은 아래를 따른다.
  - `device_push_tokens.is_active = true`
  - `permission_status = 'granted'`
  - `platform = 'ios'` 이면 `push_provider = 'apns'`
  - `platform = 'android'` 이면 `push_provider = 'fcm'`
- job 상태 규칙은 아래를 따른다.
  - 활성 토큰이 하나도 없으면 `cancelled`와 `cancel_reason = 'no-active-tokens'`로 정리한다.
  - 모든 token이 성공하면 `succeeded`다.
  - 일부 성공, 일부 실패면 `partially-failed`다.
  - 전부 실패했고 재시도 가능 오류가 남아 있으면 `retrying`으로 둔다.
  - 전부 실패했고 재시도 한도를 넘기면 `failed`다.
- 재시도 규칙은 아래를 따른다.
  - 네트워크 오류, APNs 5xx, FCM 5xx, rate limit은 재시도 대상이다.
  - backoff는 `1분 -> 5분 -> 15분` 3회로 제한한다.
  - 재시도 시 새 job을 만들지 않고 같은 job의 `next_retry_at`만 갱신한다.
- 만료 토큰 정리 규칙은 아래를 따른다.
  - APNs `BadDeviceToken`, `Unregistered`
  - FCM `UNREGISTERED`, `INVALID_ARGUMENT`
  - 위 오류는 `device_push_tokens.is_active = false` 와 `deactivation_reason = 'delivery-failed'`로 정리한다.
  - 만료 토큰은 재시도 대상에서 제외한다.
- 운영 환경변수 이름은 아래처럼 고정한다.
  - `APNS_KEY_ID`
  - `APNS_TEAM_ID`
  - `APNS_BUNDLE_ID`
  - `APNS_PRIVATE_KEY`
  - `FCM_PROJECT_ID`
  - `FCM_CLIENT_EMAIL`
  - `FCM_PRIVATE_KEY`
  - `FCM_PRIVATE_KEY_ID`
- 위 비밀값은 앱 클라이언트가 아니라 서버 worker 또는 Edge Function 런타임에서만 사용한다.

### 완료 체크포인트

- [x] 서버 발송 플로우가 결정됐다.
- [x] 중복 방지 규칙이 결정됐다.
- [x] 멀티 디바이스 정책이 결정됐다.

## 8. Phase 5. 도메인 mutation 연동

### 내가 할 것

- [ ] create, update, complete, skip, archive 후 실제 발송 계획이 바뀌는지 검증할 준비를 한다.

### 네가 할 것

- [x] 아래 mutation 뒤에 서버 발송 계획 재계산을 연결한다.
  - [x] create
  - [x] update
  - [x] complete
  - [x] skip
  - [x] archive
- [x] 수정 시 `effective_from_utc` 이후 미래 occurrence만 재조정되게 유지한다.
- [x] 과거 log immutable 규칙을 유지한다.

### 정리 결과

- `syncAfterMutation`는 mutation 뒤 서버 발송 job 재계산을 먼저 실행한다.
- 서버 발송 job 재계산은 현재 기기 권한이 없어도 실행된다.
- scope 규칙은 item 단위 미래 occurrence 재계산 기준으로 유지한다.
  - create: 생성 직후 item scope로 future job 생성
  - update: `effective_from_utc` 이후 future job만 재계산
  - complete: 완료 뒤 해당 item future job 재계산
  - skip: 건너뜀 뒤 해당 item future job 재계산
  - archive: 해당 item future job cancel
- 재계산 대상은 앞으로 14일 범위를 유지한다.
- stale job은 삭제하지 않고 `cancelled`로 전환한다.
- 새로운 future occurrence는 `dedupe_key` 기준 upsert 한다.
- completion log는 기존 append-only 규칙을 그대로 유지한다.

### 완료 체크포인트

- [x] 주요 mutation 뒤 서버 발송 계획이 다시 맞춰진다.
- [x] 수정 이후 과거 occurrence는 유지된다.

## 9. Phase 6. 검증

### 내가 할 것

- [ ] 앱을 닫은 상태에서 iPhone으로 푸시 수신을 확인한다.
- [ ] 앱을 닫은 상태에서 Android로 푸시 수신을 확인한다.
- [ ] 같은 계정의 여러 기기에서 정책대로 푸시가 오는지 확인한다.
- [ ] 권한 거부, 로그아웃, 토큰 만료 상황을 점검한다.

### 네가 할 것

- [ ] 디버그용 상태 노출 또는 로그 확인 경로를 정리한다.
- [ ] 검증 시나리오별 기대 결과를 문서화한다.

### 완료 체크포인트

- [ ] 앱 미실행 상태에서도 알림이 온다.
- [ ] 여러 기기에서 정책대로 일관되게 알림이 온다.
- [ ] 완료, 건너뜀, 수정, 삭제 뒤 중복 발송이 없다.
- [ ] 무효 토큰 또는 로그아웃 기기로 더 이상 발송되지 않는다.

## 10. 문서 반영 대상

### 내가 할 것

- [ ] Apple/Firebase 콘솔 준비가 끝날 때마다 실제 값 보관 위치를 갱신한다.

### 네가 할 것

- [ ] `IMPLEMENTATION_PLAN.md`에서 원격 푸시 전환 문서를 참조하게 만든다.
- [ ] `SYSTEM_DESIGN.md`의 알림 구조를 원격 푸시 기준으로 갱신한다.
- [ ] `DOMAIN_LOGIC.md`의 notification sync 절차를 서버 발송 기준으로 갱신한다.
- [ ] 필요하면 `DATABASE.sql` 초안을 원격 푸시 기준으로 갱신한다.

### 완료 체크포인트

- [ ] 구현 문서와 설계 문서가 같은 방향을 본다.

## 11. 최종 확인 순서

- [x] Apple APNs 준비가 완료됐다.
- [x] Firebase FCM 준비가 완료됐다.
- [ ] 앱 토큰 등록 구조가 완료됐다.
- [ ] 서버 발송 구조가 완료됐다.
- [ ] 주요 mutation 뒤 발송 계획 재계산이 완료됐다.
- [ ] 앱을 닫은 상태에서도 iOS/Android에서 알림이 온다.
