"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  WebTrackingProvider,
  useWebTracking,
} from "@dream-mythic/web-tracking";

function RouteTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackPageView } = useWebTracking();
  const query = searchParams.toString();

  useEffect(() => {
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ""}`;
    void trackPageView({ url });
  }, [pathname, query, trackPageView]);

  return null;
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  return (
    <WebTrackingProvider
      backendUrl={process.env.NEXT_PUBLIC_WEB_TRACKING_BACKEND_URL ?? ""}
      appId={process.env.NEXT_PUBLIC_WEB_TRACKING_APP_ID ?? ""}
      token={process.env.NEXT_PUBLIC_WEB_TRACKING_TOKEN ?? ""}
    >
      <RouteTracking />
      {children}
    </WebTrackingProvider>
  );
}
