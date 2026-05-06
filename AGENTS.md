# AGENTS.md

## MUST

- user-edited code: 요청 없이 되돌리거나 덮어쓰지 않는다.
- 날짜 포맷 관련 구현은 `date-fns`를 우선 사용한다.
- `as unknown as` 캐스트는 사용하지 않는다. 타입은 `z.infer` 등으로 직접 맞춘다.
- `ios/`, `android/` 네이티브 생성 코드는 직접 수정하지 않는다.
- 네이티브 설정 변경이 필요하면 `app.config.ts`, config plugin, Expo prebuild 설정 등 재생성 가능한 경로를 사용한다.

## AGENT_FRIENDLY_DOCS

- 문서, 설정, 가이드는 agent friendly하게 작성한다.
- 짧은 문장, 명확한 구조
- 중복 최소화, 한 문단 한 주제
- 목록 깊이 일관성 유지
- 제목은 짧고 역할 중심으로 작성
- 예시는 꼭 필요한 것만 유지
- README, 제품/설계/구현/도메인 문서는 요약과 구조가 바로 보여야 함
- 자주 읽는 문서는 추가보다 가독성과 검색성을 우선

## SECURITY

- 릴리즈 보안 점검은 `docs/security/RELEASE_SECURITY_REVIEW.md`를 확인한다.
- 의존성 audit 운영 기준은 `docs/security/DEPENDENCY_AUDIT.md`를 확인한다.
- secret 노출 점검 운영 기준은 `docs/security/SECRET_EXPOSURE_CHECK.md`를 확인한다.

## TOOLING

- 외부 서비스 작업은 사용 가능한 플러그인/MCP를 먼저 사용한다.
- GitHub, Supabase, Notion, Figma 등 플러그인이 있는 작업은 CLI나 웹 수동 확인보다 플러그인 도구를 우선한다.
- CLI는 로컬 검증, 플러그인이 제공하지 않는 기능, 또는 플러그인 실패 시 fallback으로 사용한다.
- Supabase schema, migration, cron, function 확인과 적용은 Supabase MCP를 먼저 시도한다.

## Agent skills

### Issue tracker

이슈, PRD, 이슈 기반 작업 흐름은 GitHub Issues 기준으로 관리한다. 자세한 기준은 `docs/agents/issue-tracker.md`를 본다.

### Triage labels

triage 라벨은 기본 5개 역할 이름을 그대로 사용한다. 자세한 매핑은 `docs/agents/triage-labels.md`를 본다.

### Domain docs

도메인 문서는 single-context 구조를 사용한다. 자세한 기준은 `docs/agents/domain.md`를 본다.

## COMMIT

- prefix: `feat:` | `fix:` | `refactor:` | `chore:` | `docs:` | `test:`
- scope(`type(scope): ...`) 사용 금지

## LANGUAGE

- agent response: 한국어
- code comment: 한국어
- commit message: 한국어
- UI text: 한국어
