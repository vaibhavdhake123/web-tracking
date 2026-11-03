import { describe, expect, it, vi } from "vitest";
import { WebTrackingClient } from "../../src/client/WebTrackingClient.js";

describe("session tracking", () => {
  it("starts and heartbeats using separate payload endpoints", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new WebTrackingClient({
      backendUrl: "https://api.test",
      appId: "app",
      token: "1234567890123456789012345678901234567890",
      fetch,
    });
    await client.startSession();
    await client.heartbeat();
    expect(fetch.mock.calls[0]?.[0]).toContain("/session/start");
    expect(fetch.mock.calls[1]?.[0]).toContain("/session/heartbeat");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toHaveProperty(
      "sessionId",
    );
  });
});
