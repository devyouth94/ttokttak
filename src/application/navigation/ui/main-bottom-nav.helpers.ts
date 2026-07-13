export function shouldNavigateMainBottomNavRoute(
  isActive: boolean,
  defaultPrevented: boolean
): boolean {
  return !isActive && !defaultPrevented;
}
