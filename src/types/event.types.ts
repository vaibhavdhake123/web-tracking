export type EventProperties = Record<string, string | number | boolean | null>;

export type TrafficSource =
  | {
      type: "campaign";
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    }
  | { type: "referral"; hostname: string }
  | { type: "direct" };

export interface DeviceInfo {
  category: "desktop" | "mobile" | "tablet" | "unknown";
  userAgent: string;
}

export interface EventPayload {
  appId: string;
  visitorId: string;
  sessionId: string;
  eventName: string;
  pageUrl: string;
  pageTitle: string;
  referrer: string;
  source: TrafficSource;
  device: DeviceInfo;
  browser: string;
  properties?: EventProperties;
  timestamp: string;
}

export interface PageViewOptions {
  url?: string;
  title?: string;
  referrer?: string;
  properties?: EventProperties;
}

export interface SessionPayload {
  appId: string;
  visitorId: string;
  sessionId: string;
  pageUrl: string;
  referrer: string;
  timestamp: string;
}
