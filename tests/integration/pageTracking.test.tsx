import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WebTrackingProvider } from "../../src/provider/WebTrackingProvider.js";

const token = "1234567890123456789012345678901234567890";

describe("page tracking", () => {
  it("tracks an initial page view once and supports manual route changes", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(
      <WebTrackingProvider
        backendUrl="https://api.test"
        appId="app"
        token={token}
        fetch={fetch}
      >
        <div />
      </WebTrackingProvider>,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const body = JSON.parse(String(fetch.mock.calls[1]?.[1]?.body));
    expect(body.eventName).toBe("page_view");
    expect(body.appId).toBe("app");
  });
});
