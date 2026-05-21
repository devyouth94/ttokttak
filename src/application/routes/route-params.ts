type RouteParamValue = string | string[] | undefined;

export function getFirstRouteParam(value: RouteParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
