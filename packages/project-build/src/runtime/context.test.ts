import { describe, expect, test } from "vitest";
import { builderRuntimeContext } from "./context";

describe("builderRuntimeContext", () => {
  test("provides runtime-owned id generation", () => {
    expect(builderRuntimeContext.createId()).toMatch(/^[\w-]{21}$/);
    expect(builderRuntimeContext.createId()).not.toEqual(
      builderRuntimeContext.createId()
    );
  });
});
