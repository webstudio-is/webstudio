import { describe, expect, test } from "vitest";
import { assertContentEngineReferenceCoverage } from "./content-engine-reference";

describe("Content Engine reference", () => {
  test("covers the schema-backed query contract", () => {
    expect(assertContentEngineReferenceCoverage).not.toThrow();
  });
});
