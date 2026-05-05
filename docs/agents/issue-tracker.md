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
