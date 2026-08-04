type RouteParamValue = string | string[] | undefined;
type ScheduleReturnPath = "/" | "/calendar" | "/home" | "/schedule";

export function getFirstRouteParam(value: RouteParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getScheduleReturnPath(returnTo?: string): ScheduleReturnPath {
  if (
    returnTo === "/calendar" ||
    returnTo === "/home" ||
    returnTo === "/schedule"
  ) {
    return returnTo;
  }

  return "/";
}
