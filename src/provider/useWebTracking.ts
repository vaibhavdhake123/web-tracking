import { useContext } from "react";
import { WebTrackingContext } from "./WebTrackingContext.js";

export function useWebTracking() {
  const context = useContext(WebTrackingContext);
  if (!context) {
    throw new Error("useWebTracking must be used within WebTrackingProvider.");
  }
  return context;
}
