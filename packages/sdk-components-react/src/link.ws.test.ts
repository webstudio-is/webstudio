import { expect, test } from "vitest";
import { meta } from "./link.ws";

test("exposes navigation behavior in content mode", () => {
  expect(meta.props?.href?.contentMode).toBe(true);
  expect(meta.props?.target?.contentMode).toBe(true);
  expect(meta.props?.download?.contentMode).toBe(true);
});
