import { ENDPOINTS } from "../constants/endpoints.js";
import {
  normalizeConfig,
  type WebTrackingConfig,
} from "../types/config.types.js";
import type {
  EventPayload,
  EventProperties,
  PageViewOptions,
  SessionPayload,
} from "../types/event.types.js";
import { request, TrackingRequestError } from "./request.js";
import { withRetry } from "./retry.js";
import { getBrowserName } from "../utils/browser.js";
import { getDeviceInfo } from "../utils/device.js";
import { getSessionId, clearSessionId } from "../utils/sessionId.js";
import { getTrafficSource } from "../utils/trafficSource.js";
import { sanitizePageUrl } from "../utils/url.js";
import { clearVisitorId, getVisitorId } from "../utils/visitorId.js";
import { getCurrentPage } from "../tracking/pageTracking.js";
import { getPerformanceMetrics } from "../tracking/performanceTracking.js";

export class WebTrackingClient {
  private readonly config;
  private readonly fetchImplementation: typeof globalThis.fetch;
  private active: boolean;
  private enabled: boolean;
  private consentGranted: boolean;
  private sessionStart: Promise<void> | undefined;
  private lastPageUrl = "";
  private readonly eventQueue: EventPayload[] = [];

  constructor(config: WebTrackingConfig) {
    this.config = normalizeConfig(config);
    const fetchImplementation = config.fetch ?? globalThis.fetch;
    if (!fetchImplementation) {
      throw new Error("This environment does not provide fetch.");
    }
    this.fetchImplementation = fetchImplementation;
    this.enabled = this.config.enabled;
    this.consentGranted = this.config.consentGranted;
    this.active = this.enabled && this.consentGranted;
  }

  get isActive(): boolean {
    return this.active;
  }

  setConsent(granted: boolean): void {
    this.consentGranted = granted;
    this.active = this.enabled && this.consentGranted;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.active = this.enabled && this.consentGranted;
  }

  private log(message: string): void {
    if (this.config.debug && typeof console !== "undefined") {
      console.info(`[web-tracking] ${message}`);
    }
  }

  private get page() {
    const current = getCurrentPage();
    return {
      url: sanitizePageUrl(current.url),
      title: current.title,
      referrer: current.referrer,
    };
  }

  private sessionPayload(): SessionPayload {
    return {
      appId: this.config.appId,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      pageUrl: this.page.url,
      referrer: this.page.referrer,
      timestamp: new Date().toISOString(),
    };
  }

  private async post<T>(
    path: string,
    payload: unknown,
  ): Promise<T | undefined> {
    const send = () =>
      request<T>(
        this.fetchImplementation,
        `${this.config.backendUrl}${path}`,
        payload,
        this.config.requestTimeout,
        this.config.token,
      );
    try {
      return await withRetry(
        send,
        this.config.retryCount,
        250,
        (error) =>
          error instanceof TrackingRequestError &&
          (error.status === 429 ||
            (error.status !== undefined && error.status >= 500) ||
            error.message.includes("timed out") ||
            error.message.includes("could not be completed")),
      );
    } catch (error) {
      this.log(
        error instanceof TrackingRequestError
          ? error.message
          : "Tracking request failed.",
      );
      throw error;
    }
  }

  async startSession(): Promise<void> {
    if (!this.active) return;
    if (this.sessionStart) return this.sessionStart;
    this.sessionStart = this.post(ENDPOINTS.sessionStart, this.sessionPayload())
      .then(() => undefined)
      .catch((error: unknown) => {
        this.sessionStart = undefined;
        throw error;
      });
    return this.sessionStart;
  }

  async heartbeat(): Promise<void> {
    if (!this.active) return;
    await this.post(ENDPOINTS.sessionHeartbeat, this.sessionPayload());
  }

  async endSession(): Promise<void> {
    if (!this.active) return;
    const payload = this.sessionPayload();
    const url = `${this.config.backendUrl}${ENDPOINTS.sessionEnd}`;
    await request(
      this.fetchImplementation,
      url,
      payload,
      this.config.requestTimeout,
      this.config.token,
      true,
    );
  }

  async trackEvent(
    eventName: string,
    properties?: EventProperties,
  ): Promise<void> {
    if (!this.active) return;
    const current = this.page;
    const event: EventPayload = {
      appId: this.config.appId,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      eventName,
      pageUrl: current.url,
      pageTitle: current.title,
      referrer: current.referrer,
      source: getTrafficSource(current.url, current.referrer),
      device: getDeviceInfo(),
      browser: getBrowserName(),
      ...(properties ? { properties } : {}),
      timestamp: new Date().toISOString(),
    };
    await this.queueEvent(event);
  }

  async trackBatch(
    events: Array<{ eventName: string; properties?: EventProperties }>,
  ): Promise<void> {
    if (!this.active || events.length === 0) return;
    const current = this.page;
    const batch = events.slice(0, this.config.maxQueueSize).map((item) => ({
      appId: this.config.appId,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      eventName: item.eventName,
      pageUrl: current.url,
      pageTitle: current.title,
      referrer: current.referrer,
      source: getTrafficSource(current.url, current.referrer),
      device: getDeviceInfo(),
      browser: getBrowserName(),
      ...(item.properties ? { properties: item.properties } : {}),
      timestamp: new Date().toISOString(),
    }));
    await this.post(ENDPOINTS.batch, {
      appId: this.config.appId,
      events: batch,
    });
  }

  async trackPageView(options: PageViewOptions = {}): Promise<void> {
    if (!this.active || !this.config.trackPageViews) return;
    const current = this.page;
    const url = sanitizePageUrl(options.url ?? current.url);
    if (!url || url === this.lastPageUrl) return;
    this.lastPageUrl = url;
    const pageTitle = options.title ?? current.title;
    const referrer = options.referrer ?? current.referrer;
    const properties: EventProperties = {
      ...(options.properties ?? {}),
      ...(this.config.trackPerformance
        ? Object.fromEntries(
            Object.entries(getPerformanceMetrics() ?? {}).filter(
              ([, value]) => value !== undefined,
            ),
          )
        : {}),
    };
    const event: EventPayload = {
      appId: this.config.appId,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      eventName: "page_view",
      pageUrl: url,
      pageTitle,
      referrer,
      source: getTrafficSource(url, referrer),
      device: getDeviceInfo(),
      browser: getBrowserName(),
      ...(Object.keys(properties).length ? { properties } : {}),
      timestamp: new Date().toISOString(),
    };
    await this.queueEvent(event);
  }

  private async queueEvent(event: EventPayload): Promise<void> {
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.eventQueue.shift();
    }
    this.eventQueue.push(event);
    await this.flushEvents();
  }

  async flushEvents(): Promise<void> {
    if (!this.active || this.eventQueue.length === 0) return;
    const events = this.eventQueue.splice(0, this.eventQueue.length);
    try {
      if (events.length === 1) {
        await this.post(ENDPOINTS.collect, events[0]);
      } else {
        await this.post(ENDPOINTS.batch, { appId: this.config.appId, events });
      }
    } catch (error) {
      this.eventQueue.unshift(...events);
      if (this.eventQueue.length > this.config.maxQueueSize) {
        this.eventQueue.splice(
          0,
          this.eventQueue.length - this.config.maxQueueSize,
        );
      }
      throw error;
    }
  }

  async queryAnalytics<T>(
    endpoint: keyof Pick<
      typeof ENDPOINTS,
      | "realtime"
      | "overview"
      | "pages"
      | "events"
      | "sources"
      | "devices"
      | "locations"
      | "funnels"
      | "performance"
    >,
    parameters: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(`${this.config.backendUrl}${ENDPOINTS[endpoint]}`);
    for (const [key, value] of Object.entries(parameters)) {
      url.searchParams.set(key, value);
    }
    const response = await this.fetchImplementation(url.toString(), {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      signal: AbortSignal.timeout(this.config.requestTimeout),
      headers: { "X-Web-Tracking-Token": this.config.token },
    });
    if (!response.ok) {
      throw new TrackingRequestError(
        `Analytics query failed with status ${response.status}.`,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new TrackingRequestError(
        "Analytics endpoint returned invalid JSON.",
      );
    }
  }

  getRealtime<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("realtime", parameters);
  }

  getOverview<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("overview", parameters);
  }

  getPages<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("pages", parameters);
  }

  getEvents<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("events", parameters);
  }

  getSources<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("sources", parameters);
  }

  getDevices<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("devices", parameters);
  }

  getLocations<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("locations", parameters);
  }

  getFunnels<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("funnels", parameters);
  }

  getPerformance<T>(parameters?: Record<string, string>): Promise<T> {
    return this.queryAnalytics<T>("performance", parameters);
  }

  clearIdentifiers(): void {
    clearVisitorId();
    clearSessionId();
    this.lastPageUrl = "";
    this.eventQueue.length = 0;
  }
}
