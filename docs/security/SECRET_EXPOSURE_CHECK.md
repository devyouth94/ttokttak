# Secret Exposure Check

이 문서는 secret 노출 점검 운영 기준이다.
출시별 실행 결과는 `docs/security/RELEASE_SECURITY_REVIEW.md`에 기록한다.

## 목적

- 앱 번들, git, 로그, Supabase 설정에 secret이 섞였는지 확인한다.
- public env와 secret env 경계를 유지한다.
- 노출이 발견되면 credential 폐기부터 새 빌드 생성까지 빠짐없이 처리한다.

## 주기

- 출시 전에는 반드시 실행한다.
- `.env*`, `app.config.ts`, config plugin, EAS / CI 설정 변경 후 실행한다.
- Supabase Edge Function, Vault, push provider, Sentry 설정 변경 후 실행한다.
- repo 공개, 외부 공유, 신규 개발자 온보딩 전 실행한다.

## 금지 위치

아래 값은 git, 앱 번들, Sentry event, Edge Function 로그, EAS / CI 로그에 있으면 안 된다.

- Supabase service role key
- Supabase secret key
- APNs private key
- FCM private key
- Sentry auth token
- EAS / CI token
- OAuth client secret
- private key 파일과 service account json

## 허용 Public Env

아래 값은 앱 번들에 들어갈 수 있다.
그래도 실제 값은 문서나 로그에 남기지 않는다.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID`
- `EXPO_PUBLIC_SENTRY_DSN`

`EXPO_PUBLIC_*`에는 secret 값을 넣지 않는다.
새 public env를 추가하면 이 문서에 허용 사유를 남긴다.

## Ignore 기준

아래 파일은 git에 추적되면 안 된다.

- `.env`
- `.env.*`
- `.env*.local`
- `.google/`
- `google-services.json`
- `GoogleService-Info.plist`
- `sentry.properties`
- `*.p8`
- `*.p12`
- `*.pem`
- `*.key`
- `*.jks`
- `*.mobileprovision`
- `ios/`
- `android/`
- `supabase/functions/.env`
- `supabase/functions/.env.*`

예시 파일이 필요하면 `.env.example`처럼 secret 없는 placeholder만 둔다.

## 명령

git 추적 상태를 확인한다.

```bash
git ls-files -- .env .env.local .env.development.local .env.production.local .google/google-services.json ios/sentry.properties android/app/google-services.json android/sentry.properties GoogleService-Info.plist google-services.json '*.p8' '*.pem' '*.key' '*.mobileprovision'
git ls-files | rg '(^|/)(\.env|.*\.p8$|.*\.pem$|.*\.key$|google-services\.json$|GoogleService-Info\.plist$|sentry\.properties$|.*service-account.*\.json$|.*private.*\.json$)'
```

ignored 상태를 확인한다.

```bash
git check-ignore -v .env.local .google/google-services.json ios/sentry.properties android/app/google-services.json android/sentry.properties
```

tracked source에서 credential-like 문자열을 검색한다.

```bash
rg -n "Bearer eyJ|sntrys_|sb_secret|-----BEGIN|AIza[0-9A-Za-z_-]{20,}|service_role.*eyJ|SUPABASE_SERVICE_ROLE_KEY=.*|SENTRY_AUTH_TOKEN=.*|APNS_PRIVATE_KEY=.*|FCM_PRIVATE_KEY=.*|EAS_TOKEN=.*" . --glob '!node_modules/**' --glob '!ios/**' --glob '!android/**' --glob '!.git/**' --glob '!.env*' --glob '!.google/**' --glob '!supabase/.temp/**'
```

Expo config와 export 산출물을 만든다.

```bash
set -a; source .env.local; set +a
npx expo config --json >/tmp/ttokttak-sec06-expo-config.json
npx expo export --platform android --output-dir /tmp/ttokttak-sec06-export-android --clear
npx expo export --platform ios --output-dir /tmp/ttokttak-sec06-export-ios --clear
```

export 산출물을 검색한다.

```bash
rg -n "SERVICE_ROLE|PRIVATE_KEY|SENTRY_AUTH_TOKEN|SENTRY_AUTH|APNS_|FCM_|EAS_|GOOGLE_AUTH|APPLE_" /tmp/ttokttak-sec06-expo-config.json /tmp/ttokttak-sec06-export-android /tmp/ttokttak-sec06-export-ios
find /tmp/ttokttak-sec06-export-android /tmp/ttokttak-sec06-export-ios -type f \( -name '.env*' -o -name '*.p8' -o -name '*.pem' -o -name '*.key' -o -name 'google-services.json' -o -name 'GoogleService-Info.plist' -o -name 'sentry.properties' -o -name '*service-account*.json' -o -name '*private*.json' \) -print
```

Supabase 설정을 확인한다.

```bash
npx supabase secrets list --output json
npx supabase functions list --output json
```

## Supabase 기준

- 앱 클라이언트에는 publishable key만 둔다.
- `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function env에만 둔다.
- APNs / FCM private key는 Edge Function env에만 둔다.
- cron worker 호출 secret은 Supabase Vault와 Edge Function env에만 둔다.
- migration에는 token 리터럴을 남기지 않는다.

## 노출 시 조치

노출이 확인되면 아래 순서로 처리한다.

1. 노출 위치를 더 확산하지 않는다.
2. 해당 credential을 폐기하고 새 값으로 교체한다.
3. Supabase Edge Function env, Vault, EAS / CI secret을 갱신한다.
4. 앱 번들에 포함된 값이면 새 빌드를 만든다.
5. 로그나 Sentry event에 남은 값은 삭제 또는 접근 제한한다.
6. `docs/security/RELEASE_SECURITY_REVIEW.md`에 노출 범위, 교체 시간, 재검증 결과를 기록한다.

## 예외 기록

예외는 아래 항목을 모두 남긴다.

- 값의 성격
- public으로 허용한 이유
- 포함 위치
- 재검증 명령
- 재검토 조건
