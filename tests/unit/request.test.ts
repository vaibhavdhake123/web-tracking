import { describe, expect, it, vi } from "vitest";
import { request, TrackingRequestError } from "../../src/client/request.js";

describe("request", () => {
  it("posts JSON to the given endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    await expect(
      request(
        fetchMock,
        "https://api.test/path",
        { appId: "app" },
        1000,
        "1".repeat(40),
      ),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/path",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Web-Tracking-Token": "1".repeat(40),
        },
        body: '{"appId":"app"}',
      }),
    );
  });

  it("reports HTTP, network, malformed JSON, and timeout failures", async () => {
    await expect(
      request(
        vi.fn().mockResolvedValue(new Response("", { status: 503 })),
        "https://api.test",
        {},
        1000,
        "1".repeat(40),
      ),
    ).rejects.toBeInstanceOf(TrackingRequestError);
    await expect(
      request(
        vi.fn().mockRejectedValue(new Error("offline")),
        "https://api.test",
        {},
        1000,
        "1".repeat(40),
      ),
    ).rejects.toThrow("could not be completed");
    await expect(
      request(
        vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
        "https://api.test",
        {},
        1000,
        "1".repeat(40),
      ),
    ).rejects.toThrow("invalid JSON");
    vi.useFakeTimers();
    const pendingFetch = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const result = request(
      pendingFetch,
      "https://api.test",
      {},
      5,
      "1".repeat(40),
    );
    const timeoutAssertion = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(6);
    await timeoutAssertion;
  });
});
