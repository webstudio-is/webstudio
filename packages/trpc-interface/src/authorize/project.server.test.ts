import { describe, test, expect } from "vitest";
import { __testing__ } from "./project.server";

const { isRolePermitted } = __testing__;

describe("isRolePermitted", () => {
  describe("workspace owner (own relation)", () => {
    test("own relation grants view permit", () => {
      expect(isRolePermitted(["own"], "view")).toBe(true);
    });

    test("own relation grants edit permit", () => {
      expect(isRolePermitted(["own"], "edit")).toBe(true);
    });

    test("own relation grants build permit", () => {
      expect(isRolePermitted(["own"], "build")).toBe(true);
    });

    test("own relation grants admin permit", () => {
      expect(isRolePermitted(["own"], "admin")).toBe(true);
    });

    test("own relation grants own permit", () => {
      expect(isRolePermitted(["own"], "own")).toBe(true);
    });
  });

  describe("administrators", () => {
    test("grants view permit", () => {
      expect(isRolePermitted(["administrators"], "view")).toBe(true);
    });

    test("grants edit permit", () => {
      expect(isRolePermitted(["administrators"], "edit")).toBe(true);
    });

    test("grants build permit", () => {
      expect(isRolePermitted(["administrators"], "build")).toBe(true);
    });

    test("grants admin permit", () => {
      expect(isRolePermitted(["administrators"], "admin")).toBe(true);
    });

    test("denies own permit", () => {
      expect(isRolePermitted(["administrators"], "own")).toBe(false);
    });
  });

  describe("builders", () => {
    test("grants view permit", () => {
      expect(isRolePermitted(["builders"], "view")).toBe(true);
    });

    test("grants edit permit", () => {
      expect(isRolePermitted(["builders"], "edit")).toBe(true);
    });

    test("grants build permit", () => {
      expect(isRolePermitted(["builders"], "build")).toBe(true);
    });

    test("denies admin permit", () => {
      expect(isRolePermitted(["builders"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isRolePermitted(["builders"], "own")).toBe(false);
    });
  });

  describe("editors", () => {
    test("grants view permit", () => {
      expect(isRolePermitted(["editors"], "view")).toBe(true);
    });

    test("grants edit permit", () => {
      expect(isRolePermitted(["editors"], "edit")).toBe(true);
    });

    test("denies build permit", () => {
      expect(isRolePermitted(["editors"], "build")).toBe(false);
    });

    test("denies admin permit", () => {
      expect(isRolePermitted(["editors"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isRolePermitted(["editors"], "own")).toBe(false);
    });
  });

  describe("viewers", () => {
    test("grants view permit", () => {
      expect(isRolePermitted(["viewers"], "view")).toBe(true);
    });

    test("denies edit permit", () => {
      expect(isRolePermitted(["viewers"], "edit")).toBe(false);
    });

    test("denies build permit", () => {
      expect(isRolePermitted(["viewers"], "build")).toBe(false);
    });

    test("denies admin permit", () => {
      expect(isRolePermitted(["viewers"], "admin")).toBe(false);
    });

    test("denies own permit", () => {
      expect(isRolePermitted(["viewers"], "own")).toBe(false);
    });
  });

  describe("multiple relations", () => {
    test("uses highest privilege from multiple relations", () => {
      // User has both viewer and builder relations
      expect(isRolePermitted(["viewers", "builders"], "build")).toBe(true);
    });

    test("own in any position grants all", () => {
      expect(isRolePermitted(["viewers", "own"], "own")).toBe(true);
    });
  });

  describe("empty relations", () => {
    test("empty relations deny all permits", () => {
      expect(isRolePermitted([], "view")).toBe(false);
      expect(isRolePermitted([], "edit")).toBe(false);
      expect(isRolePermitted([], "build")).toBe(false);
      expect(isRolePermitted([], "admin")).toBe(false);
      expect(isRolePermitted([], "own")).toBe(false);
    });
  });

  describe("unknown relation strings", () => {
    test("unknown relation denies permit", () => {
      expect(isRolePermitted(["unknown"], "view")).toBe(false);
    });
  });
});
