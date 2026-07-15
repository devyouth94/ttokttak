# Dependency Audit

이 문서는 npm 의존성 보안 점검 운영 기준이다.
출시별 실행 결과는 해당 출시의 QA 문서나 이슈에 기록한다.

## 목적

- 공개된 패키지 취약점이 앱 런타임, 빌드, 테스트 경로에 남아 있는지 확인한다.
- 수정 가능한 항목은 lockfile 또는 override로 줄인다.
- 즉시 수정하지 않는 항목은 영향 범위와 재검토 조건을 남긴다.

## 주기

- 출시 전에는 반드시 실행한다.
- 의존성 추가 또는 업데이트 후 실행한다.
- Expo SDK 또는 React Native 업그레이드 전후 실행한다.
- 평소에는 스프린트마다 1회 확인한다.

## 명령

```bash
pnpm install
pnpm audit --audit-level moderate
pnpm audit --audit-level low
pnpm why <package>
```

`moderate` 이상은 출시 전 판정 대상이다.
`low`는 출시 차단은 아니지만 dev-only 여부와 upstream 대기 여부를 기록한다.

## 분류

- `runtime`: 앱 번들 또는 사용자 실행 경로에 포함된다. 우선 수정한다.
- `build-time`: Expo config, Metro, prebuild, native project 생성 도구 경로다. 업데이트 가능하면 수정한다.
- `dev-only`: Jest, jsdom, lint, test helper 경로다. severity와 실행 조건을 보고 판단한다.

## 처리 기준

- patched 버전이 semver range 안에 있으면 lockfile 갱신으로 처리한다.
- semver range 밖이어도 호환성이 명확하면 `pnpm-workspace.yaml`의 `overrides`를 사용할 수 있다.
- override를 추가하면 `pnpm-workspace.yaml`과 `pnpm-lock.yaml`을 함께 커밋한다.
- override 후에는 Expo config와 Metro export까지 확인한다.
- major override가 CommonJS / ESM, peer dependency, native tooling을 깨뜨릴 수 있으면 예외로 둔다.

## 검증

override 또는 의존성 갱신 후 아래를 실행한다.

```bash
npx expo config --json
npx expo export --platform android --output-dir /tmp/ttokttak-export-android --clear
npx expo export --platform ios --output-dir /tmp/ttokttak-export-ios --clear
pnpm jest --runInBand
npx tsc --noEmit
pnpm lint
git diff --check
```

`expo export`가 `.env.local` 값을 shell env로 요구하면 아래처럼 실행한다.

```bash
set -a; source .env.local; set +a
```

## 예외 기록

예외는 아래 항목을 모두 남긴다.

- package 이름과 advisory severity
- 유입 경로
- runtime / build-time / dev-only 분류
- 즉시 수정하지 않는 이유
- 확인한 실제 사용 경로
- 재검토 조건

## 현재 override

`pnpm-workspace.yaml`에 기록한다.
아래 항목은 `pnpm audit`에서 확인한 transitive dependency 취약점을 줄이기 위한 override다.

- `@tootallnate/once@>=2.0.0 <2.0.1` → `2.0.1`
- `brace-expansion@>=5.0.0 <5.0.6` → `5.0.6`
- `form-data@>=4.0.0 <4.0.6` → `4.0.6`
- `js-yaml@>=3.0.0 <3.15.0` → `3.15.0`
- `js-yaml@>=4.0.0 <4.2.0` → `4.2.0`
- `postcss` → `8.5.12`
- `shell-quote@>=1.1.0 <=1.8.3` → `1.8.4`
- `undici@>=6.0.0 <6.27.0` → `6.27.0`
- `uuid` → `11.1.1`
- `ws@>=7.0.0 <7.5.11` → `7.5.11`
- `ws@>=8.0.0 <8.20.1` → `8.21.0`

## 현재 예외

### `@babel/core`

- severity: low
- 고정 버전: `7.29.0`
- 유입 경로: Expo CLI, Metro, Jest의 Babel 변환 경로
- 분류: build-time / dev-only
- 이유: patched 버전 `7.29.7`에서 Metro가 Expo의 `expo-asset`을 해석하지 못한다.
- 확인한 실제 사용 경로: 앱, 테스트, 설치된 `node_modules` 소스를 Metro와 Jest가 변환하는 빌드·테스트 프로세스다. 취약 입력은 해당 프로세스 권한의 로컬 파일에 접근할 수 있으며 앱 런타임에는 포함되지 않는다.
- 재검토 조건: Expo SDK가 patched 버전을 직접 사용하면 제거한다.
