"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { WebTrackingClient } from "../client/WebTrackingClient.js";
import type { WebTrackingConfig } from "../types/config.types.js";
import { WebTrackingContext } from "./WebTrackingContext.js";

export interface WebTrackingProviderProps extends WebTrackingConfig {
  children: ReactNode;
}

export function WebTrackingProvider({
  children,
  ...config
}: WebTrackingProviderProps) {
  const client = useMemo(
    () => new WebTrackingClient(config),
    [config.backendUrl, config.appId, config.token],
  );
  const configRef = useRef(config);
  configRef.current = config;

  const safely = useCallback(
    async (operation: () => Promise<void>): Promise<void> => {
      try {
        await operation();
      } catch {
        if (configRef.current.debug && typeof console !== "undefined") {
          console.info("[web-tracking] A tracking request failed.");
        }
      }
    },
    [],
  );
  const trackEvent = useCallback(
    (eventName: string, properties?: Parameters<typeof client.trackEvent>[1]) =>
      safely(() => client.trackEvent(eventName, properties)),
    [client, safely],
  );
  const trackPageView = useCallback(
    (options?: Parameters<typeof client.trackPageView>[0]) =>
      safely(() => client.trackPageView(options)),
    [client, safely],
  );
  const setConsent = useCallback(
    (granted: boolean) => {
      client.setConsent(granted);
    },
    [client],
  );
  const disableTracking = useCallback(
    (clearIdentifiers = false) => {
      client.setConsent(false);
      if (clearIdentifiers) client.clearIdentifiers();
    },
    [client],
  );

  useEffect(() => {
    client.setEnabled(configRef.current.enabled ?? true);
    client.setConsent(
      configRef.current.consent === undefined
        ? true
        : typeof configRef.current.consent === "boolean"
          ? configRef.current.consent
          : !configRef.current.consent.required ||
            configRef.current.consent.granted,
    );
    if (!client.isActive) return;
    void safely(() => client.startSession());
    if (configRef.current.trackPageViews ?? true) {
      void safely(() => client.trackPageView());
    }
    const interval = window.setInterval(
      () => void safely(() => client.heartbeat()),
      configRef.current.heartbeatInterval ?? 25_000,
    );
    const endSession = () => {
      void safely(() => client.endSession());
    };
    window.addEventListener("pagehide", endSession);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", endSession);
    };
  }, [
    client,
    safely,
    config.enabled,
    config.consent,
    config.heartbeatInterval,
    config.trackPageViews,
  ]);

  const value = useMemo(
    () => ({ client, trackEvent, trackPageView, setConsent, disableTracking }),
    [client, disableTracking, setConsent, trackEvent, trackPageView],
  );
  return (
    <WebTrackingContext.Provider value={value}>
      {children}
    </WebTrackingContext.Provider>
  );
}
