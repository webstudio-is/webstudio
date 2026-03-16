import { describe, test, expect } from "vitest";
import { __testing__ } from "./project.server";

const { isWorkspaceRelationPermitted } = __testing__;

describe("isWorkspaceRelationPermitted", () => {
  describe("workspace owner (own relation)", () => {
    test("own relation grants view permit", () => {
      expect(isWorkspaceRelationPermitted(["own"], "view")).toBe(true);
    });

    test("own relation grants edit permit", () => {
      expect(isWorkspaceRelationPermitted(["own"], "edit")).toBe(true);
    });

    test("own relation grants build permit", () => {
      expect(isWorkspaceRelationPermitted(["own"], "build")).toBe(true);
    });

    test("own relation grants admin permit", () => {
      expect(isWorkspaceRelationPermitted(["own"], "admin")).toBe(true);
    });

    test("own relation grants own permit", () => {
      expect(isWorkspaceRelationPermitted(["own"], "own")).toBe(true);
    });
  });

  describe("administrators", () => {
    test("grants view permit", () => {
      expect(isWorkspaceRelationPermitted(["administrators"], "view")).toBe(
        true
      );
    });

    test("grants edit permit", () => {
      expect(isWorkspaceRelationPermitted(["administrators"], "edit")).toBe(
        true
      );
    });

    test("grants build permit", () => {
      expect(isWorkspaceRelationPermitted(["administrators"], "build")).toBe(
        true
      );
    });

    test("grants admin permit", () => {
      expect(isWorkspaceRelationPermitted(["administrators"], "admin")).toBe(
        true
      );
    });

    test("denies own permit", () => {
      expect(isWorkspaceRelationPermitted(["administrators"], "own")).toBe(
        false
      );
    });
  });

  describe("builders", () => {
    test("grants view permit", () => {
      expect(isWorkspaceRelationPermitted(["builders"], "view")).toBe(true);
    });

    test("grants edit permit", () => {
      expect(isWorkspaceRelationPermitted(["builders"], "edit")).toBe(true);
    });

    test("grants build permit", () => {
      expect(isWorkspaceRelationPermitted(["builders"], "build")).toBe(true);
    });

    test("denies admin permit", () => {
      expect(isWorkspaceRelationPermitted(["builders"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isWorkspaceRelationPermitted(["builders"], "own")).toBe(false);
    });
  });

  describe("editors", () => {
    test("grants view permit", () => {
      expect(isWorkspaceRelationPermitted(["editors"], "view")).toBe(true);
    });

    test("grants edit permit", () => {
      expect(isWorkspaceRelationPermitted(["editors"], "edit")).toBe(true);
    });

    test("denies build permit", () => {
      expect(isWorkspaceRelationPermitted(["editors"], "build")).toBe(false);
    });

    test("denies admin permit", () => {
      expect(isWorkspaceRelationPermitted(["editors"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isWorkspaceRelationPermitted(["editors"], "own")).toBe(false);
    });
  });

  describe("viewers", () => {
    test("grants view permit", () => {
      expect(isWorkspaceRelationPermitted(["viewers"], "view")).toBe(true);
    });

    test("denies edit permit", () => {
      expect(isWorkspaceRelationPermitted(["viewers"], "edit")).toBe(false);
    });

    test("denies build permit", () => {
      expect(isWorkspaceRelationPermitted(["viewers"], "build")).toBe(false);
    });

    test("denies admin permit", () => {
      expect(isWorkspaceRelationPermitted(["viewers"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isWorkspaceRelationPermitted(["viewers"], "own")).toBe(false);
    });
  });

  describe("multiple relations", () => {
    test("uses highest privilege from multiple relations", () => {
      // User has both viewer and builder relations
      expect(
        isWorkspaceRelationPermitted(["viewers", "builders"], "build")
      ).toBe(true);
    });

    test("own in any position grants all", () => {
      expect(isWorkspaceRelationPermitted(["viewers", "own"], "own")).toBe(
        true
      );
    });
  });

  describe("empty relations", () => {
    test("empty relations deny all permits", () => {
      expect(isWorkspaceRelationPermitted([], "view")).toBe(false);
      expect(isWorkspaceRelationPermitted([], "edit")).toBe(false);
      expect(isWorkspaceRelationPermitted([], "build")).toBe(false);
      expect(isWorkspaceRelationPermitted([], "admin")).toBe(false);
      expect(isWorkspaceRelationPermitted([], "own")).toBe(false);
    });
  });

  describe("unknown relation strings", () => {
    test("unknown relation denies permit", () => {
      expect(isWorkspaceRelationPermitted(["unknown"], "view")).toBe(false);
    });
  });
});
