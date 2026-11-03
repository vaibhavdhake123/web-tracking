import { describe, expect, it } from "vitest";
import { getBrowserName } from "../../src/utils/browser.js";

describe("getBrowserName", () => {
  it("detects common browsers and safely falls back", () => {
    expect(getBrowserName("Mozilla/5.0 Edg/120.0")).toBe("Edge");
    expect(getBrowserName("Mozilla/5.0 Firefox/120.0")).toBe("Firefox");
    expect(getBrowserName("unrecognized")).toBe("unknown");
    expect(getBrowserName("")).toBe("unknown");
  });
});
