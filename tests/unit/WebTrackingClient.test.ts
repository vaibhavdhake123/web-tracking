import { describe, expect, it, vi } from "vitest";
import { WebTrackingClient } from "../../src/client/WebTrackingClient.js";

const token = "1234567890123456789012345678901234567890";

function makeFetch() {
  return vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
}

describe("WebTrackingClient", () => {
  it("validates config and strips trailing slashes", async () => {
    const fetch = makeFetch();
    const client = new WebTrackingClient({
      backendUrl: "https://api.test///",
      appId: " app ",
      token,
      fetch,
    });
    await client.startSession();
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://api.test/api/web-tracking/session/start",
    );
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)).appId).toBe(
      "app",
    );
    expect(
      () =>
        new WebTrackingClient({
          backendUrl: "/bad",
          appId: "x",
          token,
        }),
    ).toThrow("Invalid backendUrl");
    expect(
      () =>
        new WebTrackingClient({
          backendUrl: "https://api.test",
          appId: " ",
          token,
        }),
    ).toThrow("appId");
  });

  it("requires exactly 40 numeric token digits", () => {
    expect(() =>
      Reflect.construct(WebTrackingClient, [
        { backendUrl: "https://api.test", appId: "app" },
      ]),
    ).toThrow("exactly 40 numeric digits");
    for (const invalid of [
      "1".repeat(39),
      "1".repeat(41),
      `${"1".repeat(39)}x`,
      `${"1".repeat(39)}-`,
    ]) {
      expect(
        () =>
          new WebTrackingClient({
            backendUrl: "https://api.test",
            appId: "app",
            token: invalid,
          }),
      ).toThrow("exactly 40 numeric digits");
    }
    expect(
      new WebTrackingClient({
        backendUrl: "https://api.test",
        appId: "app",
        token,
        enabled: false,
        fetch: makeFetch(),
      }),
    ).toBeInstanceOf(WebTrackingClient);
  });

  it("tracks events and respects disabled and consent-blocked state", async () => {
    const fetch = makeFetch();
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      fetch,
    });
    await client.trackEvent("signup", { placement: "header" });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/web-tracking/collect",
      expect.objectContaining({
        body: expect.stringContaining('"eventName":"signup"'),
      }),
    );
    const disabledFetch = makeFetch();
    const disabled = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      enabled: false,
      fetch: disabledFetch,
    });
    await disabled.trackEvent("ignored");
    await disabled.startSession();
    expect(disabledFetch).not.toHaveBeenCalled();
    const consentFetch = makeFetch();
    const consent = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      consent: false,
      fetch: consentFetch,
    });
    await consent.trackEvent("ignored");
    expect(consentFetch).not.toHaveBeenCalled();
  });

  it("authenticates every tracking POST without changing event payload fields", async () => {
    const fetch = makeFetch();
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      fetch,
    });
    await client.startSession();
    await client.heartbeat();
    await client.endSession();
    await client.trackEvent("signup", { placement: "header" });
    await client.trackBatch([{ eventName: "custom" }]);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://api.test/api/web-tracking/session/start",
      "https://api.test/api/web-tracking/session/heartbeat",
      "https://api.test/api/web-tracking/session/end",
      "https://api.test/api/web-tracking/collect",
      "https://api.test/api/web-tracking/batch",
    ]);
    for (const [, init] of fetch.mock.calls) {
      expect(init?.headers).toMatchObject({
        "X-Web-Tracking-Token": token,
      });
    }
    expect(fetch.mock.calls[2]?.[1]?.keepalive).toBe(true);
    const eventBody = JSON.parse(String(fetch.mock.calls[3]?.[1]?.body));
    expect(eventBody).toMatchObject({
      appId: "app",
      eventName: "signup",
      properties: { placement: "header" },
    });
    expect(eventBody).not.toHaveProperty("token");
  });

  it("authenticates all nine analytics GET endpoints", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(new Response("{}", { status: 200 })),
    );
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      fetch,
    });
    const getters = [
      client.getRealtime.bind(client),
      client.getOverview.bind(client),
      client.getPages.bind(client),
      client.getEvents.bind(client),
      client.getSources.bind(client),
      client.getDevices.bind(client),
      client.getLocations.bind(client),
      client.getFunnels.bind(client),
      client.getPerformance.bind(client),
    ];
    for (const getter of getters) await getter({ appId: "app" });
    expect(fetch).toHaveBeenCalledTimes(9);
    for (const [url, init] of fetch.mock.calls) {
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({ "X-Web-Tracking-Token": token });
      expect(String(url)).toContain("appId=app");
    }
  });

  it("never logs the configured token in debug mode", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      debug: true,
      fetch: vi.fn().mockRejectedValue(new Error("network error")),
    });
    await expect(client.trackEvent("custom")).rejects.toThrow();
    expect(info).toHaveBeenCalled();
    expect(JSON.stringify(info.mock.calls)).not.toContain(token);
  });

  it("sends explicit batches to the batch endpoint", async () => {
    const fetch = makeFetch();
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      fetch,
    });
    await client.trackBatch([
      { eventName: "first" },
      { eventName: "second", properties: { source: "menu" } },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/web-tracking/batch",
      expect.objectContaining({
        body: expect.stringContaining('"eventName":"second"'),
      }),
    );
  });

  it("limits the number of events in an explicit batch", async () => {
    const fetch = makeFetch();
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      maxQueueSize: 1,
      fetch,
    });
    await client.trackBatch([{ eventName: "first" }, { eventName: "second" }]);
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.events).toHaveLength(1);
    expect(body.events[0].eventName).toBe("first");
  });

  it("uses the defined lifecycle endpoints and deduplicates page views", async () => {
    const fetch = makeFetch();
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      fetch,
    });
    await client.startSession();
    await client.heartbeat();
    await client.trackPageView({ url: "https://site.test/" });
    await client.trackPageView({ url: "https://site.test/" });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://api.test/api/web-tracking/session/start",
      "https://api.test/api/web-tracking/session/heartbeat",
      "https://api.test/api/web-tracking/collect",
    ]);
  });

  it("bounds retries and retains failed events within the queue limit", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token,
      retryCount: 1,
      fetch,
    });
    await client.trackEvent("retry-me");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
