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
- 복구 endpoint는 응답 로그 금지, 감사 로그, rate limit, 사용자 소유권 확인을 가져야 한다.
- 이 결정은 strict E2EE가 아니며, 서버 실행 경계가 악의적이면 사용자가 내용을 복구하는 순간 평문 접근이 가능하다.
- 개발 기간의 기존 앱 정적 key 기반 데이터는 보존하지 않고 reset할 수 있다.
