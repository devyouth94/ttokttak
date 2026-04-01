# Implementation Plan

이 문서는 이미 확정된 제품/설계/도메인 결정을 구현 순서로 재배열한 작업 계획이다.
제품 범위와 화면 요구사항의 기준은 `PRODUCT_SPEC.md`를 따른다.
구성요소 책임과 데이터 흐름의 기준은 `SYSTEM_DESIGN.md`를 따른다.
반복 계산, 상태 판정, 알림 동기화 규칙의 기준은 `DOMAIN_LOGIC.md`를 따른다.
UI 시안 검토가 필요할 때는 `PRODUCT_SPEC.md`의 화면 요구사항과 UX 방향을 기준으로 한다.

## 1. Build order

각 phase는 사용자가 완료 여부를 바로 확인할 수 있는 1~3개 작업 단위로 나눈다.
각 phase는 아래 작업을 모두 확인하면 완료로 본다.

### Phase 1: App shell
- Expo app init
- Expo Router setup

### Phase 2: Session and profile bootstrap
- Supabase client
- auth/session bootstrap
- profile timezone initialization

### Phase 3: Base app infrastructure
- base design system
- Sentry setup

### Phase 4: Domain model
- recurrence types
- recurrence validation

### Phase 5: Occurrence calculation
- occurrence derivation
- status resolution

### Phase 6: Anchor and edge cases
- anchor type logic
- edge case tests

### Phase 7: Core repositories
- recurring items repository
- completion logs repository

### Phase 8: Device and reservation repositories
- devices repository
- notification reservation repository

### Phase 9: Account and item setup
- login
- create item
- edit item

### Phase 10: Home feed
- home feed
- Today / Upcoming / Overdue sections

### Phase 11: Occurrence actions
- complete
- skip

### Phase 12: History
- history

### Phase 13: Calendar
- calendar

### Phase 14: Notification permission and startup sync
- permission flow
- sync on app start

### Phase 15: Notification sync on mutations
- sync on mutations

### Phase 16: Device-scoped notification persistence
- device-scoped reservation persistence

### Phase 17: Widget
- widget read-only

### Phase 18: UX polish
- empty/loading/error states
- UX refinement

### Phase 19: QA stabilization
- bug fixing

### Phase 20: README and demo wrap-up
- README
- demo assets

---

## 2. Engineering priorities
1. domain logic correctness
2. predictable UX
3. notification consistency
4. architecture clarity
5. implementation speed

---

## 3. Scope control rules
Do not add:
- snooze
- auto postpone
- statistics dashboard
- collaborative features
- widget action buttons
- full offline sync

---

## 4. Portfolio documentation points
Capture during implementation:
- why occurrence is derived instead of stored
- why anchorType exists
- why server-first with limited offline was chosen
- how timezone is handled
- how device-scoped notifications support future multi-device expansion
