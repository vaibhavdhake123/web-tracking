import { describe, expect, it } from "vitest";
import { getDeviceInfo } from "../../src/utils/device.js";

describe("getDeviceInfo", () => {
  it("classifies common device types", () => {
    expect(getDeviceInfo("Mozilla iPhone Mobile").category).toBe("mobile");
    expect(getDeviceInfo("Mozilla iPad").category).toBe("tablet");
    expect(getDeviceInfo("Mozilla Windows NT").category).toBe("desktop");
    expect(getDeviceInfo("").category).toBe("unknown");
  });
});
