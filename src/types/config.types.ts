export interface ConsentConfiguration {
  required: boolean;
  granted: boolean;
}

export type TrackingConsent = boolean | ConsentConfiguration;

export interface WebTrackingConfig {
  backendUrl: string;
  appId: string;
  token: string;
  enabled?: boolean;
  debug?: boolean;
  heartbeatInterval?: number;
  trackPageViews?: boolean;
  trackPerformance?: boolean;
  consent?: TrackingConsent;
  requestTimeout?: number;
  retryCount?: number;
  maxQueueSize?: number;
  fetch?: typeof globalThis.fetch;
}

export interface NormalizedWebTrackingConfig {
  backendUrl: string;
  appId: string;
  token: string;
  enabled: boolean;
  debug: boolean;
  heartbeatInterval: number;
  trackPageViews: boolean;
  trackPerformance: boolean;
  requestTimeout: number;
  retryCount: number;
  maxQueueSize: number;
  fetch?: typeof globalThis.fetch;
  consentGranted: boolean;
}

export function normalizeConfig(
  config: WebTrackingConfig,
): NormalizedWebTrackingConfig {
  if (typeof config.backendUrl !== "string" || !config.backendUrl.trim()) {
    throw new Error("WebTrackingProvider requires a valid backendUrl.");
  }
  const backendUrl = config.backendUrl.trim().replace(/\/+$/, "");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(backendUrl);
  } catch {
    throw new Error(
      "Invalid backendUrl: provide an absolute HTTP or HTTPS URL.",
    );
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      "Invalid backendUrl: only HTTP and HTTPS URLs are supported.",
    );
  }
  if (typeof config.appId !== "string" || !config.appId.trim()) {
    throw new Error("WebTrackingProvider requires a non-empty appId.");
  }
  if (typeof config.token !== "string" || !/^\d{40}$/.test(config.token)) {
    throw new Error(
      "WebTrackingProvider requires a token containing exactly 40 numeric digits.",
    );
  }
  for (const [name, value] of [
    ["heartbeatInterval", config.heartbeatInterval],
    ["requestTimeout", config.requestTimeout],
    ["maxQueueSize", config.maxQueueSize],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new Error(`${name} must be a positive number.`);
    }
  }
  if (
    config.maxQueueSize !== undefined &&
    !Number.isInteger(config.maxQueueSize)
  ) {
    throw new Error("maxQueueSize must be a positive integer.");
  }
  if (
    config.retryCount !== undefined &&
    (!Number.isFinite(config.retryCount) ||
      config.retryCount < 0 ||
      !Number.isInteger(config.retryCount))
  ) {
    throw new Error("retryCount must be a non-negative integer.");
  }

  const consent = config.consent;
  const consentGranted =
    consent === undefined ||
    (typeof consent === "boolean"
      ? consent
      : !consent.required || consent.granted);

  return {
    backendUrl,
    appId: config.appId.trim(),
    token: config.token,
    enabled: config.enabled ?? true,
    debug: config.debug ?? false,
    heartbeatInterval: config.heartbeatInterval ?? 25_000,
    trackPageViews: config.trackPageViews ?? true,
    trackPerformance: config.trackPerformance ?? true,
    requestTimeout: config.requestTimeout ?? 10_000,
    retryCount: config.retryCount ?? 0,
    maxQueueSize: config.maxQueueSize ?? 100,
    ...(config.fetch ? { fetch: config.fetch } : {}),
    consentGranted,
  };
}
