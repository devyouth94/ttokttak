# Dependency Audit

이 문서는 npm 의존성 취약점을 점검하고 판정하는 절차다.
특정 시점의 audit 결과와 예외는 출시 이슈나 QA 기록에 남긴다.

## 실행 시점

- 출시 전.
- 의존성 추가 또는 갱신 후.
- Expo SDK 또는 React Native 업그레이드 전후.

## 조사

```sh
pnpm install
pnpm audit --audit-level moderate
pnpm audit --audit-level low
pnpm why <package>
```

`moderate` 이상은 출시 전에 판정한다.
`low`는 출시 차단 여부보다 실제 유입 경로와 실행 조건을 확인한다.

각 advisory를 다음 중 하나로 분류한다.

- `runtime`: 앱 번들이나 사용자 실행 경로에 포함됨.
- `build-time`: Expo config, Metro, prebuild 또는 native project 생성에 사용됨.
- `dev-only`: 테스트, lint와 개발 도구에서만 사용됨.

## 처리

1. patched 버전이 기존 range 안에 있으면 lockfile을 갱신한다.
2. 호환성이 확인된 transitive dependency만 `pnpm-workspace.yaml`의 override로 고정한다.
3. override와 `pnpm-lock.yaml`을 함께 변경한다.
4. 즉시 수정하지 않으면 출시 이슈에 근거와 재검토 조건을 남긴다.

현재 override의 기준은 `pnpm-workspace.yaml`이다.
이 문서에 버전 snapshot을 복제하지 않는다.

예외 기록에는 다음을 포함한다.

- package와 advisory severity.
- 유입 경로와 분류.
- 실제 사용 경로.
- 즉시 수정하지 않는 이유.
- 재검토 조건.

## 검증

의존성이나 override를 바꾼 뒤 다음을 실행한다.

```sh
pnpm exec expo config --json
pnpm exec expo export --platform android --output-dir /tmp/ttokttak-export-android --clear
pnpm exec expo export --platform ios --output-dir /tmp/ttokttak-export-ios --clear
pnpm jest --runInBand
pnpm exec tsc --noEmit
pnpm lint
git diff --check
```

환경 변수가 없어 export를 실행하지 못하면 누락한 검증과 이유를 출시 기록에 남긴다.
