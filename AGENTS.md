# AGENTS.md

## Worktree

- 사용자 변경사항은 요청 없이 되돌리거나 덮어쓰지 않는다.
- 커밋은 사용자가 명시적으로 요청할 때만 만든다.
- `ios/`, `android/` 네이티브 생성 코드는 직접 수정하지 않는다.
- 네이티브 설정은 `app.config.ts`, config plugin, Expo prebuild 설정처럼 재생성 가능한 경로에서 변경한다.

## Code

- 날짜 포맷은 `date-fns`와 `date-fns-tz`를 우선 사용한다.
- `as unknown as` 캐스트는 사용하지 않는다.
- 타입은 `z.infer` 등으로 직접 맞춘다.

## Docs

문서는 프로젝트 고유의 규칙, 이유와 예외를 중심으로 짧게 작성하고 같은 내용을 여러 문서에서 상세히 정의하지 않는다.

- `CONTEXT.md`: 도메인 용어와 관계.
- `docs/PRODUCT_SPEC.md`: 현재 제품 범위와 화면 요구사항.
- `docs/DOMAIN_LOGIC.md`: 반복 규칙, occurrence 계산과 상태 판정.
- `docs/SYSTEM_DESIGN.md`: 구현 구조, 데이터 흐름, Supabase, 알림과 암호화 경계.
- `docs/adr/`: 되돌리기 어렵고 맥락 없이는 놀라운 설계 결정.
- `docs/database/DATABASE.sql`: 현재 운영 스키마 snapshot.
- `docs/release/RELEASE.md`: build, 제출, OTA와 복구 절차.
- `docs/release/STORE_METADATA.md`: 스토어 입력 원문과 공개 URL.

도메인 개념을 다루기 전에 `CONTEXT.md`와 관련 ADR을 확인한다. 이슈, 설계와 테스트 이름은 용어 사전을 따르며, 없는 용어나 ADR과 충돌하는 결정은 `grill-with-docs`에서 합의한 뒤 문서에 반영한다.

## Security

- 의존성 audit은 `docs/security/DEPENDENCY_AUDIT.md`를 따른다.
- secret은 git, 앱 번들, Sentry event, Supabase 로그, Edge Function 로그, EAS / CI 로그에 남기지 않는다.
- 앱 번들에는 `EXPO_PUBLIC_*` public env만 포함한다.
- service role key, private key, OAuth client secret, Sentry auth token, EAS / CI token은 `EXPO_PUBLIC_*`에 넣지 않는다.

## Tooling

- 외부 서비스 작업은 사용 가능한 플러그인/MCP를 우선 사용한다.
- CLI는 로컬 검증, 플러그인이 제공하지 않는 기능과 플러그인 실패 시 fallback으로 사용한다.
- Supabase schema, migration, cron과 function 확인·적용은 Supabase MCP를 먼저 시도한다.
- 이슈, PRD와 이슈 기반 작업은 `docs/agents/issue-tracker.md`를 따른다.

## Verification

- 변경 범위에 맞는 테스트를 실행한다.
- 테스트는 깊은 모듈의 공개 interface와 사용자가 관찰하는 결과를 확인한다.
- 내부 helper의 반환 shape나 구현 문자열은 구조 계약일 때만 고정한다.
- 문서만 수정하면 최소 `pnpm exec prettier --check <files>`와 `git diff --check`를 실행한다.
- 코드 변경이면 필요에 따라 `pnpm jest --runInBand`, `pnpm exec tsc --noEmit`, `pnpm lint`를 실행한다.
- Supabase Edge Function을 수정하면 `pnpm supabase:functions:check`와 `pnpm supabase:functions:test`를 실행한다.
- 로컬에 Deno가 없으면 검증 환경 문제와 미실행 항목을 최종 응답에 적는다.
- 실행하지 못한 검증은 이유를 최종 응답에 적는다.

## Commit

- prefix: `feat:` | `fix:` | `refactor:` | `chore:` | `docs:` | `test:`
- scope(`type(scope): ...`)는 사용하지 않는다.
- commit message는 한국어로 작성한다.

## Language

- agent response, code comment와 commit message는 한국어로 작성한다.
- UI 문구는 한국어·English 번역 resource로 관리한다.
