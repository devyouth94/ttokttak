# Android Release

이 문서는 Android production 빌드와 Google Play Console 제출 절차를 기록한다.
iOS 배포 절차는 `docs/IOS_RELEASE.md`를 따른다.

## 계정 기준

Google Play Console 작업은 `devyouth94@gmail.com` 계정의 올바른 개발자 계정에서만 진행한다.
Today Square 계정에는 `똑딱` 앱, 패키지, 사용자 권한을 만들지 않는다.

Google Cloud `ttokttak` 프로젝트는 `devyouth94@gmail.com` 계정의 프로젝트를 사용한다.
Play 제출용 서비스 계정은 다음 값을 기준으로 한다.

- 서비스 계정: `ttokttak-play-submit@ttokttak.iam.gserviceaccount.com`.
- 앱 패키지: `com.youngzin.ttokttak`.
- EAS project id: `7b6d8011-8d4c-4110-967f-160aea1db801`.
- EAS build profile: `production`.
- EAS submit profile: `production`.
- EAS Update production channel: `production`.

서비스 계정 JSON key는 secret이다.
git, 문서, 이슈, 로그에 key 내용을 남기지 않는다.

## Google Play Console 준비

올바른 Play Console 개발자 계정에서 앱을 만든다.

필수값:

- 앱 이름: `똑딱`.
- 기본 언어: 한국어.
- 앱 또는 게임: 앱.
- 무료 또는 유료: 무료.
- 패키지 이름: `com.youngzin.ttokttak`.

Play Console의 사용자 및 권한에서 서비스 계정을 초대한다.
권한은 `똑딱` 앱에만 부여한다.
초기 제출에는 internal track release 권한만 사용한다.
production, finance, admin 권한은 부여하지 않는다.

## 빌드

production Android 빌드를 만든다.

```bash
pnpm exec eas build \
  --platform android \
  --profile production \
  --wait \
  --non-interactive \
  --message "<출시 변경 요약>"
```

빌드가 끝나면 build id, app version, version code, commit hash, artifact URL을 확인한다.

```bash
pnpm exec eas build:view <build-id> --json
```

확인값:

- `channel`이 `production`이다.
- `runtimeVersion`이 제출할 앱 버전과 같다.
- `appVersion`이 제출할 앱 버전과 같다.
- `gitCommitHash`가 출시 대상 커밋과 같다.
- artifact가 Android App Bundle이다.

## 제출

빌드가 완료된 build id로 Android 제출을 시작한다.

```bash
pnpm exec eas submit \
  --platform android \
  --id <build-id> \
  --wait
```

EAS가 Google Service Account JSON key를 묻는 경우 올바른 `devyouth94@gmail.com` Google Cloud 프로젝트에서 발급한 key만 사용한다.
Today Square 계정 또는 Today Square Play Console 권한으로 제출하지 않는다.

`eas.json`의 Android 제출 설정은 `submit.production.android.track = "internal"`을 사용한다.
첫 제출은 internal track에서 검증한 뒤 production 승격 여부를 따로 결정한다.

## 복구 절차

잘못된 Play Console 개발자 계정에 앱 초안이나 서비스 계정 권한을 만들었으면 그 계정에서만 삭제한다.
`devyouth94@gmail.com` Google Cloud 프로젝트의 서비스 계정은 삭제하지 않는다.

중복 빌드를 만들었고 아직 필요하지 않으면 취소한다.

```bash
pnpm exec eas build:cancel <build-id> --non-interactive
```

취소 전에 제출할 빌드와 중복 빌드의 commit hash, app version, version code를 비교한다.
