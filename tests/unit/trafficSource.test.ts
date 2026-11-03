import { describe, expect, it } from "vitest";
import { getTrafficSource } from "../../src/utils/trafficSource.js";

describe("getTrafficSource", () => {
  it("reads campaign attribution", () => {
    expect(
      getTrafficSource(
        "https://site.test/?utm_source=newsletter&utm_campaign=launch",
      ),
    ).toEqual({
      type: "campaign",
      source: "newsletter",
      campaign: "launch",
    });
  });

  it("distinguishes referral and direct traffic", () => {
    expect(
      getTrafficSource("https://site.test/", "https://search.test?q=x"),
    ).toEqual({ type: "referral", hostname: "search.test" });
    expect(getTrafficSource("https://site.test/")).toEqual({ type: "direct" });
  });
});
