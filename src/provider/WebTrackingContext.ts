import { createContext } from "react";
import type { EventProperties, PageViewOptions } from "../types/event.types.js";
import type { WebTrackingClient } from "../client/WebTrackingClient.js";

export interface WebTrackingContextValue {
  client: WebTrackingClient;
  trackEvent: (
    eventName: string,
    properties?: EventProperties,
  ) => Promise<void>;
  trackPageView: (options?: PageViewOptions) => Promise<void>;
  setConsent: (granted: boolean) => void;
  disableTracking: (clearIdentifiers?: boolean) => void;
}

export const WebTrackingContext = createContext<WebTrackingContextValue | null>(
  null,
);
