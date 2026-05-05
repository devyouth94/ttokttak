# iOS 시뮬레이터 APNs 푸시 진단

작성일: 2026-05-05

## 요약

2026-05-04부터 2026-05-05까지 iOS 시뮬레이터 원격 푸시를 재검증했다.

결론은 `iOS 26.4 (23E244)` 시뮬레이터 런타임의 APNs per-app token 취득 또는 cache 경로 문제가 가장 유력하다.
앱 관점에서는 Expo Notifications의 `getDevicePushTokenAsync` 이후 유효한 새 APNs token이 Supabase에 저장되지 않는 증상으로 보였다.
앱, Supabase delivery worker, APNs 인증 설정이 전부 깨진 상황은 아니었다.

`iOS 26.4.1 (23E254a)` 런타임에서는 같은 앱과 같은 worker로 새 APNs token이 등록됐고, 실제 원격 푸시가 도착했다.

## 영향

- Android FCM 푸시는 정상 동작했다.
- iOS 알림함 row는 생성됐지만, `iOS 26.4 (23E244)` 시뮬레이터에서 사용자 visible push가 확인되지 않았다.
- stale iOS simulator token이 여러 개 남아 있으면 worker의 `target_token_count`와 attempt 결과가 디버깅을 헷갈리게 만든다.

## 시스템 기준

원격 푸시는 아래 경로를 따른다.

1. 앱이 `device_push_tokens`에 현재 기기 push token을 등록한다.
2. 반복 일정 sync가 `notification_delivery_jobs`를 만든다.
3. `push-delivery-worker`가 due job을 읽는다.
4. worker가 `device_push_tokens.is_active = true`와 `permission_status = 'granted'`인 token만 발송 대상으로 삼는다.
5. iOS token은 APNs로 직접 발송한다.
6. Android token은 FCM으로 직접 발송한다.
7. token별 결과는 `notification_delivery_attempts`에 남긴다.
8. 성공한 원격 푸시는 `notification_inbox_items`에 사용자-facing row를 만든다.

## 수정된 서버 조건

APNs alert push에는 명시 header가 필요하다.
worker의 APNs 요청에 아래 header를 추가했다.

```http
apns-priority: 10
apns-push-type: alert
apns-topic: com.youngzin.ttokttak
```

이 수정 이후 `iOS 18.6`과 `iOS 26.4.1`에서는 원격 푸시가 성공했다.

## 관찰 타임라인

### 1. iOS 26.4 실패 구간

환경:

- Xcode: `26.4`
- iOS runtime: `iOS 26.4 (23E244)`
- simulator: `iPhone SE (2nd generation)`
- CoreSimulator UDID: `68D9665D-931C-4B13-9D30-0E81FD1C87D7`

관찰:

- 앱 삭제 후 재설치와 알림 허용을 다시 진행했다.
- 시뮬레이터 로그에 APNs per-app token 요청은 남았다.
- 같은 로그 구간에서 `com.youngzin.ttokttak` topic의 cached token이 `null`로 관찰됐다.
- 앱의 `getDevicePushTokenAsync` 경로 뒤에도 유효한 새 APNs token이 DB에 반영되지 않았다.
- Supabase `device_push_tokens`에는 새 iOS token row가 갱신되지 않았다.
- 이전에 등록된 iOS token row는 남아 있었지만, 이 token으로 사용자 visible push는 확인되지 않았다.

당시 활성 iOS token:

| token id | device id | device name | last_registered_at |
| --- | --- | --- | --- |
| `5aeb0cb1-4d9c-4e3d-b9bf-c2a8be1f4a78` | `30267c93-8d0b-4385-83f6-c2705c172399` | `iPhone SE (2nd generation)` | `2026-05-04T10:36:05.812+00:00` |

판단:

- 앱이 token registration flow에 들어가도 런타임이 유효한 APNs token을 반환하지 않는 상태였다.
- 이 상태에서는 서버가 정상이어도 iOS 시뮬레이터 푸시 검증이 신뢰하기 어렵다.

### 2. iOS 18.6 대조군 성공

환경:

- Xcode: `26.4`
- iOS runtime: `iOS 18.6 (22G86)`
- simulator: `ttokttak iPhone 16 iOS 18.6`
- CoreSimulator UDID: `3971D0E3-6955-4C6F-9B34-696994B6AD16`

새 iOS token:

| token id | device id | device name | last_registered_at |
| --- | --- | --- | --- |
| `2674ed32-a81f-4417-b159-7a6549148272` | `8bfd69aa-4cbf-4c67-ab57-ba520e5af4de` | `ttokttak iPhone 16 iOS 18.6` | `2026-05-04T13:22:35.116+00:00` |

검증 job:

| field | value |
| --- | --- |
| job id | `4d95e369-7f05-4838-a9ad-00a87820c8d7` |
| title | `iOS 18.6 푸시 확인` |
| item id | `5686509c-4cd8-4903-aff7-925e3fcdbbe2` |
| completed_at | `2026-05-04T13:26:02.209+00:00` |

결과:

- job status: `succeeded`
- iOS 18.6 APNs attempt: `succeeded`
- APNs provider message id: `692906CB-9552-0635-0F3F-FC7574F4B760`
- iOS 로그에서 remote notification 수신과 user visible push delivery가 확인됐다.

판단:

- 같은 앱 코드와 같은 worker로 다른 iOS runtime에서는 정상 동작했다.
- 서버 전체 장애나 APNs credential 전체 장애 가능성은 낮아졌다.

### 3. iOS 26.4.1 재검증 성공

환경:

- Xcode: `26.4.1`
- Xcode build: `17E202`
- installed iOS disk image: `iOS 26.4.1 (23E254a)`
- `simctl list runtimes` 표시: `iOS 26.4 (26.4.1 - 23E254a)`
- simulator: `iPhone SE (2nd generation)`
- CoreSimulator UDID: `68D9665D-931C-4B13-9D30-0E81FD1C87D7`

주의:

- Xcode UI와 `simctl list devices`는 section 이름을 `iOS 26.4`로 표시한다.
- 실제 runtime version은 `26.4.1`이고 build는 `23E254a`다.

새 iOS token:

| token id | device id | device name | last_registered_at |
| --- | --- | --- | --- |
| `3e7fae9a-94bb-4e7f-8de3-97921f3e0ca5` | `2013e210-ae1a-47f8-9922-b5827eb9abc4` | `iPhone SE (2nd generation)` | `2026-05-05T08:34:15.383+00:00` |

검증 전 정리:

- 이전 iOS token 2개를 soft deactivate 했다.
- 연결된 이전 simulator device row도 `is_active = false`로 바꿨다.
- 최신 iOS 26.4.1 token 1개만 active 상태로 남겼다.

비활성화한 token:

| token id | device id | device name |
| --- | --- | --- |
| `2674ed32-a81f-4417-b159-7a6549148272` | `8bfd69aa-4cbf-4c67-ab57-ba520e5af4de` | `ttokttak iPhone 16 iOS 18.6` |
| `5aeb0cb1-4d9c-4e3d-b9bf-c2a8be1f4a78` | `30267c93-8d0b-4385-83f6-c2705c172399` | `iPhone SE (2nd generation)` |

검증 job:

| field | value |
| --- | --- |
| job id | `34f6c7a4-8540-4e2b-b5d9-efb5e38f8d87` |
| title | `iOS 26.4.1 푸시 확인` |
| item id | `8de3c1bb-1f43-4dce-8e02-f77bbbb26110` |
| completed_at | `2026-05-05T08:40:19.051+00:00` |

결과:

- job status: `succeeded`
- `target_token_count`: `2`
- success count: `2`
- failure count: `0`
- iOS APNs attempt: `succeeded`
- Android FCM attempt: `succeeded`
- APNs provider message id: `9BE91585-12C1-EE9A-4F95-24EC57167327`
- inbox item id: `5e5319e9-2381-45c6-bcf8-f3448f7e5d4e`

`target_token_count = 2`인 이유:

- 최신 iOS 26.4.1 APNs token 1개
- 기존 Android FCM token 1개

이전 iOS stale token 2개는 attempt에 포함되지 않았다.

iOS 로그 증거:

- 알림 source `com.youngzin.ttokttak`가 Authorized 상태였다.
- UserNotifications pipeline이 notification request를 성공 처리했다.
- bulletin destination에 `Banner`, `NotificationCenter`, `LockScreen`이 포함됐다.
- 화면 캡처 시점에는 배너가 지나간 뒤였지만, 시스템 로그 기준으로 user visible notification 게시가 완료됐다.

## 최종 판단

가장 좁은 결론:

- `iOS 26.4 (23E244)` 시뮬레이터 runtime에서 APNs per-app token 취득 또는 cached token 처리 문제가 있었다.
- `iOS 26.4.1 (23E254a)`에서는 같은 simulator device UDID에서도 새 앱 device row와 새 APNs token이 등록됐다.
- `iOS 26.4.1`에서는 같은 worker와 같은 Supabase project로 원격 푸시가 user visible destination까지 도달했다.

아직 단정하지 않는 것:

- Apple APNs 전체 장애라고 단정하지 않는다.
- 앱의 token registration 코드가 영구적으로 무결하다고 단정하지 않는다.
- 실기기 iOS 전체가 안전하다고 단정하지 않는다.

현재 증거로 배제한 것:

- Android FCM 전반 장애
- Supabase job 생성 전반 장애
- inbox 생성 전반 장애
- APNs credential 전반 장애
- APNs alert header 누락 이후의 worker 전반 장애

## Stale token 운영 기준

현재 stale simulator token을 자동 정리하는 로직은 없다.
서버는 simulator runtime 삭제나 앱 재설치 이력을 직접 알 수 없다.

자동 비활성화되는 경우:

1. 로그아웃으로 현재 기기 token을 비활성화한다.
2. 알림 권한 거부로 현재 기기 token을 비활성화한다.
3. APNs 또는 FCM이 invalid token 오류를 반환하면 worker가 `delivery-failed`로 비활성화한다.

시뮬레이터 stale token은 필요할 때 수동으로 soft deactivate 한다.
hard delete는 기본값으로 쓰지 않는다.
`notification_delivery_attempts.push_token_id`가 `on delete set null`이라 데이터 무결성은 깨지지 않지만, 과거 발송 추적성이 줄어든다.

정리 SQL 예시:

```sql
select
  d.id as device_id,
  d.device_name,
  d.is_active as device_active,
  d.last_seen_at,
  t.id as token_id,
  t.is_active as token_active,
  t.permission_status,
  t.last_registered_at
from public.devices d
join public.device_push_tokens t on t.device_id = d.id
where d.platform = 'ios'
  and t.push_provider = 'apns'
order by t.last_registered_at desc;
```

```sql
update public.device_push_tokens
set
  is_active = false,
  deactivated_at = now(),
  deactivation_reason = null
where id in (
  'stale-token-id-1',
  'stale-token-id-2'
);
```

```sql
update public.devices
set is_active = false
where id in (
  'stale-device-id-1',
  'stale-device-id-2'
)
and not exists (
  select 1
  from public.device_push_tokens t
  where t.device_id = devices.id
    and t.is_active = true
);
```

## 다음 재현 절차

### 1. runtime 확인

```bash
xcodebuild -version
xcrun simctl runtime list
xcrun simctl list runtimes
xcrun simctl list devices booted
```

`26.4.1`은 아래처럼 보일 수 있다.

```text
iOS 26.4.1 (23E254a)
iOS 26.4 (26.4.1 - 23E254a)
```

version과 build를 같이 확인한다.
section 이름만 보고 `26.4.1` 여부를 판단하지 않는다.

### 2. token 등록 확인

원문 push token은 출력하지 않는다.
token id, device id, hash prefix, length만 확인한다.

확인 기준:

- 새 로그인 또는 새 알림 허용 뒤 `device_push_tokens.updated_at`이 바뀌어야 한다.
- `is_active = true`여야 한다.
- `permission_status = 'granted'`여야 한다.
- iOS는 `push_provider = 'apns'`여야 한다.

### 3. stale token 정리

테스트 전에 이전 simulator token을 soft deactivate 한다.
최신 iOS token이 1개만 남아야 iOS attempt를 읽기 쉽다.

Android token은 별도 검증 대상이면 그대로 둔다.
이 경우 job의 `target_token_count`는 iOS 1개 + Android 1개가 된다.

### 4. worker 발송 확인

확인 순서:

1. `notification_delivery_jobs`에서 job status와 count를 확인한다.
2. `notification_delivery_attempts`에서 token별 provider 결과를 확인한다.
3. `notification_inbox_items`에서 source job row를 확인한다.
4. iOS simulator log에서 UserNotifications delivery를 확인한다.

예상 성공 신호:

- job status: `succeeded`
- APNs attempt status: `succeeded`
- APNs response `httpStatus`: `200`
- iOS 로그에 `Banner`, `NotificationCenter`, `LockScreen` destination이 남는다.

## 주의 사항

- `APNs 200`은 provider가 request를 수락했다는 뜻이다.
  사용자가 배너를 봤다는 뜻과 완전히 같지는 않다.
- iOS foreground 상태에서는 앱 delegate와 presentation 설정의 영향을 받는다.
  홈 화면 또는 앱 종료 상태에서 한 번 더 확인한다.
- 시뮬레이터 화면 캡처는 배너 타이밍을 놓칠 수 있다.
  DB attempt와 iOS system log를 같이 본다.
- APNs token 원문, service role key, APNs private key, FCM private key는 문서나 로그에 남기지 않는다.
