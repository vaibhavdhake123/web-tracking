import { beforeEach, describe, expect, it } from "vitest";
import { clearSessionId, getSessionId } from "../../src/utils/sessionId.js";

describe("session identity", () => {
  beforeEach(() => clearSessionId());

  it("reuses the ID for the current browser session", () => {
    const first = getSessionId();
    expect(getSessionId()).toBe(first);
  });

  it("works if session storage is blocked", () => {
    const original = Object.getOwnPropertyDescriptor(window, "sessionStorage");
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get: () => {
        throw new Error("blocked");
      },
    });
    expect(getSessionId()).toBeTruthy();
    if (original) {
      Object.defineProperty(window, "sessionStorage", original);
    }
  });
});
