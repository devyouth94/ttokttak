import { shouldNavigateMainBottomNavRoute } from "./main-bottom-nav.helpers";

it("활성 탭이 아니고 기본 동작이 허용될 때만 이동한다", () => {
  expect([
    shouldNavigateMainBottomNavRoute(false, false),
    shouldNavigateMainBottomNavRoute(true, false),
    shouldNavigateMainBottomNavRoute(false, true),
  ]).toEqual([true, false, false]);
});
