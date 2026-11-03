export { WebTrackingProvider } from "./provider/WebTrackingProvider.js";
export type { WebTrackingProviderProps } from "./provider/WebTrackingProvider.js";
export { useWebTracking } from "./provider/useWebTracking.js";
export { trackEvent } from "./tracking/trackEvent.js";
export { WebTrackingClient } from "./client/WebTrackingClient.js";
export { TrackingRequestError } from "./client/request.js";
export type {
  ConsentConfiguration,
  TrackingConsent,
  WebTrackingConfig,
} from "./types/config.types.js";
export type {
  DeviceInfo,
  EventPayload,
  EventProperties,
  PageViewOptions,
  SessionPayload,
  TrafficSource,
} from "./types/event.types.js";
export type { PerformanceMetrics } from "./types/session.types.js";
export { getBrowserName } from "./utils/browser.js";
export { getDeviceInfo } from "./utils/device.js";
export { getTrafficSource } from "./utils/trafficSource.js";
