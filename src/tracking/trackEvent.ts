import type { EventProperties } from "../types/event.types.js";
import type { WebTrackingClient } from "../client/WebTrackingClient.js";

export function trackEvent(
  client: WebTrackingClient,
  eventName: string,
  properties?: EventProperties,
): Promise<void> {
  return client.trackEvent(eventName, properties);
}
