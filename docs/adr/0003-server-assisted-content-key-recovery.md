# Server-assisted content key recovery

일정 제목과 설명은 서버 DB table만으로 평문 복구가 불가능해야 하지만, 사용자는 별도 복구 비밀번호 없이 새 기기에서 내용을 복구할 수 있어야 한다. 따라서 콘텐츠 key 복구는 앱 정적 key가 아니라 인증된 사용자가 호출하는 Supabase Edge Function과 서버 secret/KMS/Vault 경계에 둔다.

**Considered Options**

- 앱 정적 wrapping key: 구현은 단순하지만 DB snapshot과 앱 번들만으로 제목과 설명을 복구할 수 있어 제외한다.
- 사용자 복구 비밀번호 또는 복구 문구: privacy 경계는 강해지지만 개인 리마인더 앱의 복구 실패 비용과 사용성 부담이 커서 MVP에서는 제외한다.
- 기기 public key rewrap: 더 안전하지만 구현량이 크므로 MVP 이후 강화안으로 둔다.

**Consequences**

- MVP 복구 Edge Function은 인증된 사용자에게 content key 원문을 반환할 수 있다.
- 복구 Edge Function은 content key만 복구하고, 일정 제목과 설명 ciphertext를 평문으로 복호화하지 않는다.
- 복구 Edge Function secret은 `TTOKTTAK_CONTENT_KEY_WRAP_SECRET_BASE64`로 관리하며 git, 앱 번들, 로그에 남기지 않는다.
- 복구 endpoint는 응답 로그 금지, persistent 감사 이벤트, rate limit, 사용자 소유권 확인을 가져야 한다.
- 복구 감사 이벤트는 사용자, action, key version, 결과만 남기고 content key, wrapped key, ciphertext, 일정 제목과 설명을 남기지 않는다.
- 복구 감사 이벤트의 결과 값은 낮은 해상도 enum으로 제한하고 내부 exception message를 저장하지 않는다.
- MVP 복구 감사 이벤트는 내부 운영 기록이며 사용자 조회 UI/API를 만들지 않는다.
- MVP 복구 감사 이벤트는 별도 TTL 없이 사용자 귀속 기록으로 저장하고, 사용자 삭제 시 함께 삭제한다.
- MVP rate limit은 Edge Function instance 안의 best-effort 제한으로 두고, 분산 rate limit은 감사 이벤트 기반 운영 탐지 이후 후속 강화로 둔다.
- 이 결정은 strict E2EE가 아니며, 서버 실행 경계가 악의적이면 사용자가 내용을 복구하는 순간 평문 접근이 가능하다.
- 개발 기간의 기존 앱 정적 key 기반 데이터는 보존하지 않고 reset할 수 있다.
