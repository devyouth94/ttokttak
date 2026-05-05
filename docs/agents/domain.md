# Domain Docs

이 저장소는 single-context 구조를 사용한다.

엔지니어링 스킬은 코드 탐색 전에 도메인 문서를 확인한다.

## Read First

- 루트 `CONTEXT.md`
- 루트 `docs/adr/`

파일이나 디렉터리가 없으면 조용히 넘어간다.

없는 문서를 먼저 만들자고 제안하지 않는다. `/grill-with-docs`가 용어나 결정이 정리될 때 필요한 문서를 만든다.

## Layout

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Vocabulary

이슈 제목, 리팩터링 제안, 가설, 테스트 이름에 도메인 개념을 쓸 때는 `CONTEXT.md`의 용어를 따른다.

필요한 개념이 `CONTEXT.md`에 없으면 새 용어를 임의로 만들지 않는다. 실제 공백이면 `/grill-with-docs`에서 정리할 대상으로 남긴다.

## ADR Conflicts

기존 ADR과 충돌하는 제안은 명시한다.

충돌을 숨기고 새 결정을 덮어쓰지 않는다.
