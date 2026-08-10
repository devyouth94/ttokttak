# Issue Tracker

이슈와 PRD는 GitHub Issues에서 관리한다.

## 도구

- GitHub 플러그인을 우선 사용한다.
- 플러그인이 지원하지 않거나 실패한 작업만 `gh` CLI로 처리한다.
- 저장소는 `git remote -v`의 `origin`을 기준으로 찾는다.

## Publish

이슈 트래커에 publish하라는 요청은 GitHub Issue 생성 또는 갱신을 뜻한다.

외부 상태를 바꾸는 작업은 사용자가 요청하거나 승인한 범위에서만 수행한다.

## Fetch

관련 ticket은 이슈 본문과 댓글을 함께 읽는다.

이슈 번호나 URL이 없고 대상을 특정할 수 없으면 사용자에게 확인한다.

## 구현

- 이슈 번호와 수락 기준을 먼저 확인한다.
- 이슈 브랜치는 `<type>/issue-<number>-<short-slug>` 형식을 사용한다.
- 기존 작업 브랜치나 사용자 변경사항이 있으면 새 브랜치 생성 전에 확인한다.
- 커밋과 PR은 사용자가 명시적으로 요청할 때만 만든다.
- 이슈 기반 PR에는 `Closes #<issue-number>`와 검증 결과를 적는다.

`<type>`은 `feat`, `fix`, `refactor`, `chore`, `docs`, `test` 중 하나다.

## 경계

- 계획, PRD, 이슈 작성은 이슈 작성 스킬이 담당한다.
- 구현은 저장소의 작업 규칙을 따른다.
- 커밋, 푸시, PR 생성은 GitHub publish 흐름이 담당한다.
- PR은 이슈나 PRD의 저장소로 사용하지 않는다.
