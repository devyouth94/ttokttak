# iOS Release

이 문서는 iOS production 빌드와 App Store Connect 제출 절차를 기록한다.
Android 배포 절차는 포함하지 않는다.

## 기준 설정

- EAS project id: `7b6d8011-8d4c-4110-967f-160aea1db801`.
- iOS bundle id: `com.youngzin.ttokttak`.
- App Store Connect App ID: `6762104906`.
- EAS submit profile: `production`.
- EAS build profile: `production`.

`eas.json`의 iOS 제출 설정은 `submit.production.ios.ascAppId`를 사용한다.
production 빌드는 `autoIncrement: true`와 remote app version source를 사용한다.

## 사전 조건

- Expo 계정에 로그인되어 있어야 한다.
- EAS iOS signing credentials가 준비되어 있어야 한다.
- `GOOGLE_AUTH_IOS_URL_SCHEME` 환경 변수가 EAS build 환경에 있어야 한다.
- App Store Connect API Key `.p8` 파일이 준비되어 있어야 한다.

현재 사용하는 App Store Connect API Key:

- key id: `B53DKVHW7T`.
- issuer id: `ebdf2446-c7c9-4a26-9a51-45c42fbb7915`.
- key file: `/Users/youngzin/Downloads/AuthKey_B53DKVHW7T.p8`.

`.p8` 파일 내용은 git, 문서, 로그, 이슈에 남기지 않는다.

## 빌드

production iOS 빌드를 만든다.

```bash
pnpm exec eas build \
  --platform ios \
  --profile production \
  --wait \
  --non-interactive \
  --message "<출시 변경 요약>"
```

빌드가 끝나면 build id, app version, build number, commit hash, artifact URL을 확인한다.

```bash
pnpm exec eas build:view <build-id> --json
```

## GitHub Release

출시 대상 변경을 커밋하고 `main`에 푸시한 뒤 GitHub Release를 만든다.
릴리즈 태그는 제출할 앱 버전과 맞춘다.

```bash
git push origin main
gh release create v<app-version> \
  --target <commit-sha> \
  --title "v<app-version>" \
  --notes "<릴리즈 노트>"
```

이미 만든 릴리즈가 있고 제출 빌드의 commit hash가 바뀌면 target을 최신 커밋으로 맞춘다.

```bash
gh release edit v<app-version> \
  --target <commit-sha> \
  --notes "<수정된 릴리즈 노트>"
```

확인한다.

```bash
gh release view v<app-version> --json tagName,targetCommitish,url
```

## 제출

빌드가 완료된 build id로 iOS 제출을 시작한다.

```bash
pnpm exec eas submit \
  --platform ios \
  --id <build-id> \
  --wait
```

App Store Connect API Key를 묻는 프롬프트에서는 새 key를 만들지 않는다.
기존 `.p8` 파일을 사용한다.

입력값:

- key file path: `/Users/youngzin/Downloads/AuthKey_B53DKVHW7T.p8`.
- key id: `B53DKVHW7T`.
- issuer id: `ebdf2446-c7c9-4a26-9a51-45c42fbb7915`.

EAS가 API Key를 프로젝트에 연결하면 이후 제출은 EAS 서버에 저장된 key를 사용할 수 있다.

## 제출 대기

`eas submit --wait`는 제출이 끝날 때까지 로컬에서 대기한다.
`waiting for an available submitter`는 EAS submitter 큐 대기 상태다.

제출이 생성되면 EAS submission URL을 확인한다.
로컬 대기가 길어지면 `Ctrl+C`로 wait만 종료해도 된다.
이미 생성된 원격 제출은 EAS에서 계속 진행된다.

## 주의 사항

production 빌드는 `autoIncrement: true`다.
빌드가 생성되는 시점에 remote build number가 증가할 수 있다.
Apple 로그인이나 submit 설정에서 실패해도 이미 생성된 빌드 번호는 되돌리지 않는다.

제출은 `.p8` App Store Connect API Key 방식을 우선 사용한다.
Apple 계정 로그인과 SMS 2FA 흐름은 사용하지 않는다.

## 복구 절차

중복 빌드를 만들었고 아직 필요하지 않으면 취소한다.

```bash
pnpm exec eas build:cancel <build-id> --non-interactive
```

취소 전에 제출할 빌드와 중복 빌드의 commit hash, app version, build number를 비교한다.
제출할 빌드가 이미 완료되어 있으면 완료된 build id를 기준으로 `eas submit`을 실행한다.
