# Release

이 문서는 iOS와 Android의 production build, 제출, OTA와 복구 절차를 기록한다.

설정값의 기준은 다음 파일이다.

- 앱 버전, bundle과 package: `app.config.ts`
- build, channel과 submit profile: `eas.json`
- 공개 스토어 원문과 URL: `STORE_METADATA.md`

## 계정과 secret

- Expo production project에 로그인한다.
- iOS는 올바른 Apple Developer와 App Store Connect 앱을 사용한다.
- Android는 똑딱 전용 Play Console과 Google Cloud project만 사용한다.
- 다른 제품 계정이나 project와 권한을 공유하지 않는다.
- Android 제출은 똑딱 전용 service account를 사용한다.
- App Store Connect API key와 Google service account JSON은 EAS credential로 관리한다.
- private key와 credential 파일 내용이나 로컬 경로는 git, 문서, 이슈와 로그에 남기지 않는다.
- iOS production EAS 환경에는 `GOOGLE_AUTH_IOS_URL_SCHEME`을 설정한다.

production profile은 EAS의 `production` 환경을 명시적으로 선택한다. 운영 명령은 `EXPO_NO_DOTENV=1`로 개발용 `.env.local`을 읽지 않는다. Expo 55의 개발 번들에서도 이 설정을 지키도록 `metro.config.js`가 dotenv 파일을 제외한다.

클라우드 빌드와 OTA는 EAS production 변수를 기준으로 한다. 이 컴퓨터의 `.env.production`은 기존 운영 값의 보관용 사본이며 Git에서 제외한다. 운영 명령은 이 파일을 읽지 않는다. 환경 파일 전체 구분과 개발 실행은 [`../TESTING.md`](../TESTING.md)를 따른다.

Android 서비스 계정에는 Ttokttak 앱의 제출에 필요한 최소 권한만 부여한다.
첫 제출은 internal track에서 확인한 뒤 production 승격을 별도로 결정한다.

## 출시 전 확인

1. 출시할 commit과 앱 버전을 확정한다.
2. 변경 범위의 테스트, 타입 검사와 lint를 실행한다.
3. [`../security/DEPENDENCY_AUDIT.md`](../security/DEPENDENCY_AUDIT.md)에 따라 의존성을 점검한다.
4. Edge Function 변경이 있으면 함수 검사와 테스트를 실행한다.
5. 스토어 원문과 공개 URL을 확인한다.
6. Supabase 운영 project의 요금제와 백업 제공 여부를 확인한다.

현재 이용약관과 개인정보처리방침은 무료 개인 앱 범위를 기준으로 한다.
결제, 구독 또는 광고를 추가하기 전에는 두 문서와 스토어 원문을 먼저 개정한다.

PITR은 권장하지만 필수 유료 기능이면 첫 출시에서 생략할 수 있다.
생략하면 출시 기록에 이유를 남긴다.

## 공개 계정 삭제 요청

로그인할 수 없는 사용자는 `STORE_METADATA.md`의 공개 계정 삭제 요청 URL에서 운영 문의 이메일로 요청한다. 발신 주소는 제한하지 않는다.

1. 로그인 방법, 기억하는 계정 이메일과 회신받을 이메일을 확인한다.
2. 운영자가 Supabase Auth 계정을 식별한다.
3. Auth에 저장된 계정 이메일로 확인 메일을 보내고, 그 주소에서 확인 회신을 받은 뒤 삭제한다.
4. 저장된 이메일에 접근할 수 없으면 Apple 또는 Google 계정 복구나 앱 내 삭제를 안내한다.
5. 요청 접수일부터 10일 이내에 처리 결과를 알린다. 본인 확인이나 삭제가 불가능하면 같은 기간 안에 이유와 다음 절차를 알린다.

비밀번호, 인증 코드·토큰, 신분증 사본이나 일정 내용을 요구하지 않는다. 삭제 후에는 계정, profile, 일정과 일정 버전, 완료·건너뛰기 기록, 암호화 키와 키 복구 감사 기록이 제거됐는지 확인한다. 현재 기기의 세션과 알림 정리는 앱이 시도하지만, 오프라인 상태인 다른 기기의 로컬 데이터와 알림은 원격으로 지울 수 없다.

처리 결과를 알린 뒤 요청 메일 대화 전체와 첨부파일을 Gmail 휴지통으로 옮긴다. 휴지통의 메일은 30일 안에 영구 삭제된다. 일반 문의 메일과 첨부파일도 문의 해결 후 같은 방식으로 처리한다.

개별 일정의 삭제는 계정 삭제와 다르다. 현재 앱의 일정 삭제는 활성 목록과 알림에서 제외하는 보관 처리이며, 해당 서버 기록은 계정 삭제 때까지 남는다.

## 확인되지 않은 운영 사실

- Expo EAS Update는 end-user 기록의 고정 보관기간을 공개하지 않는다. 공개 문서에는 Expo 정책의 `목적에 합리적으로 필요한 기간`만 적고 임의의 기간을 만들지 않는다.
- Supabase의 운영 기반시설에 남을 수 있는 사본의 정확한 파기 시점은 확인되지 않았다. 현재 Free 요금제에는 운영자가 복구할 수 있는 자동 backup이 제공되지 않는다는 사실만 안내한다.
- Android 공개 배포 상태와 Play Store URL은 확인되지 않았다. 확인 전에는 공개 이용 가능 platform으로 안내하지 않는다.

## 앱 버전과 runtime

`runtimeVersion`은 `appVersion` 정책을 사용한다.
같은 앱 버전과 runtime의 JavaScript와 asset 변경은 OTA로 배포할 수 있다.

다음 변경은 새 스토어 build가 필요하다.

- native dependency.
- config plugin.
- 권한과 entitlement.
- iOS 또는 Android native 설정.

build number와 version code는 EAS remote 값을 사용하며 production build에서 자동 증가한다.
실패하거나 취소한 build의 번호를 재사용하려고 되돌리지 않는다.

## OTA

production은 `production`, preview는 `preview` channel에 발행한다.
web은 운영 OTA 대상이 아니므로 iOS와 Android를 따로 발행한다.

```sh
CI=1 EXPO_NO_DOTENV=1 pnpm exec eas update \
  --channel <production|preview> \
  --environment <EAS-environment> \
  --platform <ios|android> \
  --message "<변경 요약>" \
  --non-interactive
```

native 변경이 없고 대상 build의 runtime과 앱 버전이 같은지 확인한 뒤 발행한다.

## 스토어 build

플랫폼별 production build를 만든다.

```sh
pnpm build:production \
  --platform <ios|android> \
  --wait \
  --non-interactive \
  --message "<출시 변경 요약>"
```

완료된 build를 조회한다.

```sh
pnpm exec eas build:view <build-id> --json
```

다음을 출시 대상과 대조한다.

- platform과 artifact 형식.
- `production` channel.
- app version과 runtime version.
- build number 또는 version code.
- git commit hash.

## 제출

검증한 build id만 제출한다.

```sh
pnpm exec eas submit \
  --platform <ios|android> \
  --id <build-id> \
  --wait
```

iOS는 EAS에 연결된 기존 App Store Connect API key를 사용한다.
제출 중 새 key를 만들거나 개인 Apple 계정의 SMS 인증 흐름으로 바꾸지 않는다.

Android는 EAS production submit profile의 internal track으로 제출한다.
credential을 다시 요구하면 올바른 Google Cloud project에서 발급한 service account key인지 확인한다.

`--wait`를 중단해도 이미 생성된 원격 submission은 계속 진행될 수 있다.
EAS submission URL에서 상태를 다시 확인한다.

## GitHub Release

스토어 제출 대상 commit이 `main`에 반영된 뒤 같은 앱 버전 tag로 GitHub Release를 만든다.
GitHub 플러그인을 우선 사용하고 필요한 경우 `gh`를 사용한다.

릴리스에는 사용자에게 보이는 변경과 제출 대상 commit을 기록한다.
이미 만든 tag의 대상 commit이 달라졌다면 스토어 제출 전에 바로잡는다.

## 복구

중복 build를 취소하기 전 build id, platform, app version, build number와 commit hash를 비교한다.

```sh
pnpm exec eas build:cancel <build-id> --non-interactive
```

완료된 정상 build가 있으면 새 build를 만들지 않고 해당 id로 제출한다.
잘못된 Play Console 계정에 만든 앱 초안이나 권한은 그 계정에서만 제거한다.
올바른 Google Cloud project의 제출 서비스 계정은 함께 삭제하지 않는다.

## 출시 기록

출시별 이슈나 QA 기록에 다음을 남긴다.

- 앱 버전과 git commit.
- iOS와 Android build id 및 submission URL.
- 실행한 검증과 미실행 사유.
- 운영 요금제의 백업 제공 여부와 PITR 사용 여부.
- OTA를 발행했다면 channel, platform과 메시지.
