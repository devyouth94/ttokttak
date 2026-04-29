# UI 구현 규칙

이 문서는 리디자인 및 UI 리팩터링 작업의 기준 문서다.
UI 관련 작업을 할 때는 이 문서를 먼저 확인한다.

## AppText 사용

- 텍스트 스타일은 `AppText`의 `variant`를 우선 사용한다.
- `AppText`에 외부 `style`을 주입할 때는 색상만 주입한다.
- 글자 크기, 굵기, 줄 높이, 자간이 필요하면 임시 스타일로 덮어쓰지 않는다.
- 필요한 텍스트 스타일은 `AppText` variant 또는 typography token으로 추가한다.

## styles 파일 분리

- `styles`만 담는 파일로 분리하지 않는다.

## 렌더 함수 작성

- `renderItem`, `renderHeader`, `renderFooter`처럼 `render~` 이름의 별도 함수나 변수를 만들지 않는다.
- 반복 UI가 복잡해지면 렌더 함수로 빼지 말고 컴포넌트로 분리한다.
- `FlatList`처럼 API가 `renderItem` prop을 요구하는 경우에도, 화면 파일에는 짧은 연결 JSX만 남긴다.

## 로딩 placeholder

- `AppStatePlaceholder`는 레거시 로딩 UI다.
- 리디자인 화면에서는 `AppStatePlaceholder`를 새로 사용하지 않는다.
- 로딩 UI는 화면 구조에 맞는 전용 placeholder로 만든다.
- 여러 화면에서 같은 구조가 반복될 때만 새 리디자인 기준의 공용 placeholder를 만든다.

## 컴포넌트 작성 순서

- 외부 입력과 훅을 먼저 둔다.
- 로컬 상태를 그다음에 둔다.
- 파생 값은 상태와 쿼리 결과 아래에 둔다.
- 이벤트 핸들러와 액션 함수는 `useEffect`보다 위에 둔다.
- `useEffect`는 의존하는 값과 함수가 선언된 뒤에 둔다.
- 마지막에 JSX 또는 훅의 반환 객체를 둔다.
