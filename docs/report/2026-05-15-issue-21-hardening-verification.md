# Issue 21 Hardening Verification

## 범위

GitHub issue 21의 출시 전 즉시 위험 보강 결과를 기록한다.

확인한 범위:

- `delete-account` Edge Function 타입 검사 복구.
- 사용자 데이터 조회 경계와 인덱스 보강.
- DB 백업과 PITR 운영 기준 문서화.
- Edge Function rate limit, CORS, health check, logging 경계 결정.

## Supabase Advisor

Supabase MCP advisor 도구는 현재 세션에 노출되지 않았다.
대체 절차로 Supabase CLI advisor와 lint를 확인했다.

실행한 명령:

```sh
supabase db advisors --local --fail-on none
supabase db lint --local --fail-on none
```

결과:

- 두 명령 모두 로컬 Postgres `127.0.0.1:54322` 연결 실패로 실행되지 않았다.
- 실패 원인은 로컬 Supabase DB가 실행 중이지 않은 검증 환경 문제다.
- migration과 `docs/DATABASE.sql`에 새 조회 인덱스를 반영했다.
- RLS policy 변경은 이번 범위에 포함하지 않았다.
- Edge Function 타입 검사는 `pnpm supabase:functions:check`로 확인했다.

## Migration 적용

Supabase MCP로 운영 프로젝트 `afsulksejxywonxulary`에 migration을 적용했다.

적용한 migration:

- `20260507214320_add_content_key_recovery_audit_events`
- `20260514152751_harden_user_data_fetch_indexes`

적용 전 원격 migration history에는 `20260507130258`이 있었다.
로컬에는 같은 audit migration이 `20260507214320`으로 존재했다.
CLI `supabase db push --dry-run`은 이 불일치 때문에 실패했다.

`20260507130258`은 CLI `supabase migration repair --status reverted 20260507130258`로 되돌렸다.
이후 Supabase MCP SQL 실행으로 로컬 migration version과 같은 history를 기록했다.

적용 후 확인한 인덱스:

- `idx_recurring_items_user_archived_created_at`
- `idx_devices_user_active_created_at`
- `idx_completion_logs_user_item_scheduled_at`
- `idx_completion_logs_user_item_action_acted_at`
- `idx_content_key_recovery_audit_events_user_created`

제거 확인한 이전 인덱스:

- `idx_recurring_items_user_archived`
- `idx_devices_user_active`
- `idx_completion_logs_item_scheduled_at`

CLI push 재시도 중 Supabase pooler가 `ECIRCUITBREAKER`를 반환했다.
원인은 짧은 시간 안의 temp role 인증 실패 누적이다.
최종 적용과 검증은 Supabase MCP로 완료했다.

## 운영 확인

출시 전 Supabase Dashboard에서 다음을 확인한다.

- 운영 project ref.
- 자동 백업 상태.
- 백업 보존 기간.
- PITR(Point-in-Time Recovery, 특정 시점 복구) 사용 여부.
- PITR 미사용 시 유료 기능 생략 사유.
- Edge Function 배포 상태와 최근 오류 로그.

PITR은 권장 설정이다.
유료 기능으로만 사용할 수 있으면 첫 출시는 PITR 없이 진행할 수 있다.

## 운영 확인 결과

2026-05-15 01:02 KST에 Supabase MCP와 Dashboard로 확인했다.

프로젝트:

- Project ref: `afsulksejxywonxulary`
- Project name: `ttokttak`
- Region: `ap-northeast-1`
- Status: `ACTIVE_HEALTHY`
- Dashboard status: `Healthy`
- Compute: `NANO`
- Organization plan: `FREE`

백업:

- Dashboard `Database > Backups > Scheduled backups`에서 `Free Plan does not include project backups.`를 확인했다.
- Scheduled backup은 현재 제공되지 않는다.
- 백업 보존 기간은 현재 plan에서 적용되지 않는다.
- Dashboard `Database > Backups > Point in time`에서 PITR이 `Pro Plan add-on`임을 확인했다.
- PITR은 유료 기능이므로 첫 출시는 PITR 없이 진행한다.

Edge Function:

- `recover-content-key`: `ACTIVE`, version `3`, `verify_jwt: true`
- `delete-account`: `ACTIVE`, version `4`, `verify_jwt: true`
- 최근 Edge Function 로그에는 `recover-content-key` `POST` `200` 응답 2건만 확인했다.
- 최근 Edge Function 로그에서 반복 `5xx`는 확인되지 않았다.

Advisor:

- Dashboard overview에서 `Advisor found no issues`와 `No security or performance issues found`를 확인했다.

## Edge Function 경계

`delete-account`와 `recover-content-key`는 JWT 검증을 켠 상태로 배포한다.
두 함수는 인증된 `POST` 호출만 처리한다.

이번 범위에서는 native 앱 호출만 제품 요구로 본다.
따라서 CORS `OPTIONS` 응답과 origin allowlist는 구현하지 않는다.

민감 함수에는 공개 health check endpoint를 만들지 않는다.
운영 확인은 배포 상태, function logs, smoke 호출로 수행한다.

## 검증 명령

최종 확인한 명령:

```sh
pnpm jest --runInBand
npx tsc --noEmit
pnpm lint
pnpm supabase:functions:check
pnpm exec prettier --check README.md docs/PRODUCT_SPEC.md docs/SYSTEM_DESIGN.md docs/report/2026-05-15-issue-21-hardening-verification.md
git diff --check
```

`docs/DATABASE.sql`과 migration SQL은 현재 Prettier가 parser를 추론하지 못한다.
SQL 파일 whitespace는 `git diff --check`로 확인한다.
