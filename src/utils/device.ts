import type { DeviceInfo } from "../types/event.types.js";

export function getDeviceInfo(userAgent?: string): DeviceInfo {
  const agent =
    userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const normalized = agent.toLowerCase();
  let category: DeviceInfo["category"] = "unknown";
  if (/ipad|tablet|playbook|silk/.test(normalized)) {
    category = "tablet";
  } else if (
    /mobi|iphone|ipod|android.*mobile|windows phone/.test(normalized)
  ) {
    category = "mobile";
  } else if (normalized) {
    category = "desktop";
  }
  return { category, userAgent: agent };
}
