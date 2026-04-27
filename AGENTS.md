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

## COMMIT

- prefix: `feat:` | `fix:` | `refactor:` | `chore:` | `docs:` | `test:`
- scope(`type(scope): ...`) 사용 금지

## LANGUAGE

- agent response: 한국어
- code comment: 한국어
- commit message: 한국어
- UI text: 한국어
