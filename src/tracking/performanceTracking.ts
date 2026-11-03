import type { PerformanceMetrics } from "../types/session.types.js";

export function getPerformanceMetrics(): PerformanceMetrics | undefined {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return undefined;
  }
  const navigation = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  if (!navigation) return undefined;
  return {
    pageLoadTime: Math.round(navigation.loadEventEnd),
    domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
    timeToFirstByte: Math.round(navigation.responseStart),
  };
}
