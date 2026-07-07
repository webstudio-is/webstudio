import { describe, expect, test } from "vitest";
import { runtimeGeneratedIdInput } from "./generated-id-input";

describe("runtimeGeneratedIdInput", () => {
  test("allows omitted ids", () => {
    expect(runtimeGeneratedIdInput.safeParse(undefined).success).toBe(true);
  });

  test("rejects client supplied ids", () => {
    const result = runtimeGeneratedIdInput.safeParse("manual-id");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Client-supplied ids are not allowed when creating records. Omit the id and use the id returned by Webstudio."
    );
  });
});
