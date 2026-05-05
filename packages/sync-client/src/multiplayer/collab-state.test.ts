import { describe, test, expect } from "vitest";
import { $collaborators } from "./collab-state";

describe("$collaborators", () => {
  test("initializes as empty map", () => {
    expect($collaborators.get()).toEqual(new Map());
  });
});
