# 서버 보조 content key 복구

## 맥락

서버 DB table만으로 일정 제목과 설명을 복구할 수 없어야 한다.
동시에 사용자는 별도 복구 비밀번호 없이 새 기기에서 내용을 복구할 수 있어야 한다.

## 결정

사용자별 content key를 인증된 Supabase Edge Function과 Edge secret으로 wrap하고 복구한다.
앱 정적 wrapping key는 사용하지 않는다.
새 wrapped key는 사용자 ID와 key version을 AES-GCM additional data로 결합한다.

## 결과

- 앱은 AES-GCM content key를 SecureStore에 보관한다.
- 서버 DB에는 wrapped key만 저장한다.
- Edge Function만 wrapped key를 만들거나 변경한다.
- 구버전 앱의 동일한 wrapped key upsert는 호환을 위해 허용한다.
- 기존 형식은 변경할 수 없게 보호하고 정상 복구 시 사용자 결합 형식으로 다시 wrap한다.
- Edge Function은 content key만 다루고 일정 암호문은 복호화하지 않는다.
- 복구 결과는 key와 평문 없이 낮은 해상도 감사 이벤트로 남긴다.
- 감사 이벤트는 별도 TTL 없이 유지하고 사용자가 계정을 삭제하면 wrapped key와 함께 삭제한다.
- 서버 실행 경계를 신뢰하므로 strict E2EE가 아니다.

## 검토한 대안

- 앱 정적 wrapping key: 앱 번들과 DB snapshot만으로 복구할 수 있어 제외했다.
- 사용자 복구 비밀번호 또는 복구 문구: 복구 실패 비용과 사용성 부담 때문에 제외했다.
- 기기 public key rewrap: MVP에 비해 구현과 운영 비용이 커서 제외했다.
