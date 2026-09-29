# 테스트

테스트 개수를 목표로 삼지 않는다. 데이터 유실, 권한·계정 격리, 경합, 도메인 경계, 암호화·개인정보처럼 실패 비용이 큰 동작을 공개 interface와 사용자가 관찰하는 결과로 검증한다.

구현 문자열, 내부 자료구조, 단순 mock 전달이나 상위 검사와 중복되는 검사는 두지 않는다.

애니메이션의 duration, easing, transform 값이나 Reanimated builder 호출은 자동 테스트로 고정하지 않는다. 전환·제스처·reduced motion 품질은 시뮬레이터 또는 실제 기기에서 수동 확인하고, 애니메이션과 별개인 상태 변경만 사용자가 관찰하는 결과로 테스트한다.

## 범위

- Jest: 도메인 규칙과 실패·경합 처리를 검증한다.
- 통합: 로컬 Supabase에서 소유권, 제약, 원자성과 키 복구를 검증한다.
- Maestro: iOS 앱의 일정 lifecycle, 계정 격리와 키 복구를 검증한다.

네이티브 picker, 소셜 로그인, OS 알림과 위젯은 필요한 경우 실제 기기에서 수동 확인한다.

## 실행

```sh
pnpm test
pnpm test:integration
pnpm test:e2e
```

통합 검사와 E2E 전에 `pnpm start:local-server`를 실행한다. E2E에는 별도로 `pnpm expo start`로 실행한 Metro가 필요하다. 운영 build와 OTA 검증은 [`release/RELEASE.md`](release/RELEASE.md)를 따른다.

## 안전

E2E는 이름이 `Ttokttak E2E`인 폐기 가능한 전용 시뮬레이터에서만 실행한다. runner가 keychain을 초기화하므로 개인 기기나 일상 개발용 시뮬레이터를 사용하지 않는다.

DB 초기화는 `supabase db reset --local`만 사용한다. `--linked`나 원격 `--db-url`을 사용하거나 운영 데이터·secret을 복사하지 않는다.
