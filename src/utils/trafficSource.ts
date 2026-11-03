import type { TrafficSource } from "../types/event.types.js";

export function getTrafficSource(
  pageUrl: string,
  referrer = "",
): TrafficSource {
  try {
    const url = new URL(pageUrl);
    const values: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    } = {};
    const parameters = [
      ["source", "utm_source"],
      ["medium", "utm_medium"],
      ["campaign", "utm_campaign"],
      ["term", "utm_term"],
      ["content", "utm_content"],
    ] as const;
    for (const [field, parameter] of parameters) {
      const value = url.searchParams.get(parameter);
      if (value) values[field] = value;
    }
    if (Object.values(values).some(Boolean)) {
      return { type: "campaign", ...values };
    }
    if (referrer) {
      const referrerUrl = new URL(referrer);
      if (referrerUrl.hostname && referrerUrl.hostname !== url.hostname) {
        return { type: "referral", hostname: referrerUrl.hostname };
      }
    }
  } catch {
    return { type: "direct" };
  }
  return { type: "direct" };
}
