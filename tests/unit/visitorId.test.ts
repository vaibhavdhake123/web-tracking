import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearVisitorId, getVisitorId } from "../../src/utils/visitorId.js";

describe("visitor identity", () => {
  beforeEach(() => {
    clearVisitorId();
  });

  it("reuses and persists a visitor ID", () => {
    const first = getVisitorId();
    expect(getVisitorId()).toBe(first);
    expect(first).toMatch(/^[\w-]+$/);
  });

  it("creates an ID without randomUUID", () => {
    vi.stubGlobal("crypto", {});
    expect(getVisitorId()).toMatch(/^[\da-f-]{36}$/i);
  });

  it("works when local storage is blocked", () => {
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("blocked");
      },
    });
    const first = getVisitorId();
    expect(first).toBeTruthy();
    expect(getVisitorId()).toBe(first);
  });
});
