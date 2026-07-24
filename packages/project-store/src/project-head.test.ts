import { describe, expect, test } from "vitest";
import {
  encodeObjectProjectHead,
  parseObjectProjectHead,
} from "./project-head";

const reference = {
  storage: "object",
  type: "snapshot",
  object: {
    hash: `sha256:${"a".repeat(64)}`,
    size: 12,
  },
} as const;

describe("object project head", () => {
  test("round-trips canonical bytes and rejects noncanonical JSON", async () => {
    const bytes = encodeObjectProjectHead(reference);
    await expect(parseObjectProjectHead(bytes)).resolves.toMatchObject({
      reference,
    });

    await expect(
      parseObjectProjectHead(
        new TextEncoder().encode(
          `${new TextDecoder().decode(bytes).slice(0, -1)},"extra":true}`
        )
      )
    ).rejects.toThrow("Project head is invalid");
  });
});
