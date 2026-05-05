# Issue tracker: GitHub

이 저장소의 이슈와 PRD는 GitHub Issues에서 관리한다.

모든 작업은 저장소 안에서 `gh` CLI를 사용한다. `gh`는 `git remote -v`의 `origin` 값을 기준으로 저장소를 추론한다.

## Commands

- 이슈 생성: `gh issue create --title "..." --body "..."`
- 이슈 조회: `gh issue view <number> --comments`
- 이슈 목록: `gh issue list --state open --json number,title,body,labels,comments`
- 댓글 작성: `gh issue comment <number> --body "..."`
- 라벨 추가: `gh issue edit <number> --add-label "..."`
- 라벨 제거: `gh issue edit <number> --remove-label "..."`
- 이슈 닫기: `gh issue close <number> --comment "..."`

## Publish

스킬이 "issue tracker에 publish"하라고 하면 GitHub Issue를 생성한다.

## Fetch

스킬이 관련 ticket을 가져오라고 하면 `gh issue view <number> --comments`를 실행한다.

## Work Lifecycle

에이전트가 이슈를 구현 작업으로 진행할 때는 이 문서의 흐름을 따른다.

1. 이슈를 확인한다.
2. 새 브랜치를 만든다.
3. 작업하고 검증한다.
4. 사용자가 요청하면 커밋한다.
5. 사용자가 요청하면 PR을 만든다.

## Skill Boundary

계획, PRD, 이슈 생성은 mattpocock 계열 스킬의 책임으로 본다.

이슈 구현 요청은 이 문서의 작업 흐름을 따른다.

커밋, 푸시, PR 생성 요청은 GitHub `yeet` 흐름의 책임으로 본다.

## Start Work

사용자가 특정 이슈 구현을 요청하면 에이전트는 별도 확인 없이 새 브랜치를 만들 수 있다.

이슈 구현 요청에는 이슈 번호가 필요하다.

수락 기준은 이슈 본문과 댓글에서 확인한다.

이슈 번호가 없거나 수락 기준이 불명확하면 먼저 확인한다.

현재 작업 트리에 사용자 변경사항이 있으면 되돌리거나 덮어쓰지 않는다.

## Branch

이슈 기반 작업은 새 브랜치에서 진행한다.

이미 해당 이슈 브랜치에 있으면 그대로 사용한다.

다른 작업 브랜치에 있으면 새 브랜치를 만들기 전에 사용자에게 확인한다.

새 이슈 브랜치는 기본 브랜치에서 만든다.

기본 브랜치는 `git remote show origin` 또는 현재 저장소 설정을 기준으로 확인한다.

새 이슈 브랜치를 만들기 전에 기본 브랜치가 최신인지 확인한다.

원격 변경사항을 가져오거나 병합해야 하면 사용자에게 확인한다.

작업 트리에 커밋되지 않은 변경사항이 있으면 브랜치 생성 전에 사용자에게 확인한다.

브랜치 이름은 이슈 번호를 반드시 포함한다.

권장 형식은 `<type>/issue-<number>-<short-slug>`이다.

짧은 설명이 애매하거나 불필요하면 `<type>/issue-<number>`만 사용한다.

`<type>`은 `feat`, `fix`, `refactor`, `chore`, `docs`, `test` 중 하나를 사용한다.

## Pull Request

PR은 사용자가 명시적으로 요청할 때만 만든다.

이슈 기반 PR 본문에는 `Closes #<issue-number>`를 포함한다.

PR 본문에는 검증 결과를 포함한다.

검증하지 못한 항목은 생략하지 않고 이유를 적는다.

## Verification

검증 결과는 실행한 명령과 결과를 함께 적는다.

예시:

- `npm test`: 통과
- `npm run lint`: 통과
- 미실행: Expo iOS 실기기 확인. 로컬 기기 없음.

## Commit

커밋은 사용자가 명시적으로 요청할 때만 만든다.

커밋 메시지는 루트 `AGENTS.md`의 `COMMIT` 규칙을 따른다.

## Issue State

구현을 시작할 때 `ready-for-agent` 라벨은 유지한다.

작업 중 상태를 나타내는 별도 라벨은 만들지 않는다.

PR을 만들기 전에는 이슈 댓글을 자동으로 남기지 않는다.

PR을 만들면 이슈에 PR 링크를 남긴다.
