// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

describe("server-side import", () => {
  it("imports without browser globals", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    vi.stubGlobal("navigator", undefined);
    const library = await import("../../src/index.js");
    expect(library.WebTrackingClient).toBeTypeOf("function");
  });
});
