import { describe, expect, test } from "vitest";
import { createId } from "./id";

describe("createId", () => {
  test("creates UUIDs without requiring a bound receiver", () => {
    const generate = createId;

    expect(generate()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
