export function getBrowserName(userAgent?: string): string {
  const agent =
    userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  if (!agent) return "unknown";
  if (/edg\//i.test(agent)) return "Edge";
  if (/opr\//i.test(agent) || /opera/i.test(agent)) return "Opera";
  if (/firefox\//i.test(agent)) return "Firefox";
  if (/chrome\//i.test(agent) && !/chromium/i.test(agent)) return "Chrome";
  if (/safari\//i.test(agent) && !/chrome\//i.test(agent)) return "Safari";
  return "unknown";
}
