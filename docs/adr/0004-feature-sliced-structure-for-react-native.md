# React Native Feature-Sliced Structure

Ttokttak은 전체 앱 코드 구조를 React Native와 Expo Router에 맞춘 FSD 계열 구조로 점진 전환한다. 라우트 파일은 루트 `app/`에 두고, FSD의 App layer 역할은 `src/application/`이 맡으며, 실제 화면과 기능 코드는 `src/screens`, `src/features`, `src/entities`, `src/shared`로 나눈다.

전환 실행 기준은 `../reference/react-native-fsd-transition-guide.md`에 둔다.

**Considered Options**

- 현재 구조 유지: 단기 변경 비용은 낮지만 화면, use case, 도메인 규칙, 저장소 코드가 `src/features/*` 아래에 섞이는 문제가 계속된다.
- 표준 FSD 폴더명을 그대로 사용: `app` layer 이름이 Expo Router route directory와 충돌한다.
- React Native 변형 FSD 채택: Expo Router 관례와 FSD import 규칙을 함께 지킬 수 있어 선택한다.

**Consequences**

- Expo Router route 파일은 루트 `app/`에 두고 얇게 유지한다.
- `src/app/`은 최종 구조에서 사용하지 않는다.
- `src/application/`은 provider 조립, bootstrap, app-level config만 담당한다.
- `src/screens/`는 route가 렌더링하는 화면 slice를 둔다. 모바일 문맥에 맞춰 `pages` 대신 `screens`를 사용한다.
- `src/features/`는 사용자 동작과 use case만 둔다.
- `src/entities/`는 핵심 도메인 slice를 둔다. 일정 도메인은 `schedule` slice로 시작하고 occurrence, completion log, schedule version은 그 내부 개념으로 둔다.
- `src/shared/`는 공통 기반 도구만 둔다. 최상위 segment는 `api`, `config`, `i18n`, `routes`, `ui`, `lib`로 제한한다.
- `shared/lib` 아래에는 `date`, `errors`, `notifications`, `privacy`, `query`처럼 목적이 분명한 주제 폴더를 둔다.
- `components`, `hooks`, `utils`, `helpers`, `types`, `constants`는 segment 이름으로 쓰지 않는다.
- `widgets` layer는 초기 전환 범위에서 제외한다. 여러 화면에서 재사용되는 독립적인 큰 UI 블록이 실제로 생기면 별도 결정으로 추가한다.
- 전환은 점진적으로 수행한다. 각 단계는 파일 이동, public API 정리, 같은 경계 안의 중복 제거와 얇은 wrapper 제거, 테스트 이동, 검증을 포함한다.
- 구조 전환 중 도메인 정책, UI/UX 동작, DB table/RPC 이름은 바꾸지 않는다.
