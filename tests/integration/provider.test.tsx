import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WebTrackingProvider } from "../../src/provider/WebTrackingProvider.js";
import { useWebTracking } from "../../src/provider/useWebTracking.js";

const token = "1234567890123456789012345678901234567890";

function Probe() {
  const { trackEvent, disableTracking } = useWebTracking();
  return (
    <>
      <button onClick={() => void trackEvent("clicked")}>Track</button>
      <button onClick={() => disableTracking()}>Disable</button>
    </>
  );
}

describe("provider", () => {
  it("provides tracking and avoids duplicate pageviews under Strict Mode", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(
      <StrictMode>
        <WebTrackingProvider
          backendUrl="https://api.test"
          appId="app"
          token={token}
          fetch={fetch}
        >
          <Probe />
        </WebTrackingProvider>
      </StrictMode>,
    );
    await waitFor(() => {
      expect(
        fetch.mock.calls.filter(([url]) =>
          String(url).endsWith("/api/web-tracking/collect"),
        ),
      ).toHaveLength(1);
    });
    screen.getByRole("button", { name: "Track" }).click();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(
      fetch.mock.calls.some(([url]) => String(url).endsWith("/session/start")),
    ).toBe(true);
    screen.getByRole("button", { name: "Disable" }).click();
    screen.getByRole("button", { name: "Track" }).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("cleans up the heartbeat interval on unmount", () => {
    const setInterval = vi.spyOn(window, "setInterval");
    const clearInterval = vi.spyOn(window, "clearInterval");
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const rendered = render(
      <WebTrackingProvider
        backendUrl="https://api.test"
        appId="app"
        token={token}
        fetch={fetch}
      >
        <div />
      </WebTrackingProvider>,
    );
    const intervalId = setInterval.mock.results[0]?.value;
    expect(intervalId).toBeDefined();
    rendered.unmount();
    expect(clearInterval).toHaveBeenCalledWith(intervalId);
  });

  it("does not make requests until consent is granted", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    render(
      <WebTrackingProvider
        backendUrl="https://api.test"
        appId="app"
        token={token}
        consent={false}
        fetch={fetch}
      >
        <Probe />
      </WebTrackingProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetch).not.toHaveBeenCalled();
  });
});
