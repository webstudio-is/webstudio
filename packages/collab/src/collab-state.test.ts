import { describe, test, expect } from "vitest";
import { $collaborators, $collabUnsaved } from "./collab-state";

describe("$collaborators", () => {
  test("initializes as empty map", () => {
    expect($collaborators.get()).toEqual(new Map());
  });
});

describe("$collabUnsaved", () => {
  test("initializes as false", () => {
    expect($collabUnsaved.get()).toBe(false);
  });
});
