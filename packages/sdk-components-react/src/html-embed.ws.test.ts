import { expect, test } from "vitest";
import { meta } from "./html-embed.ws";

test("exposes embed code in content mode", () => {
  expect(meta.props?.code?.contentMode).toBe(true);
});
