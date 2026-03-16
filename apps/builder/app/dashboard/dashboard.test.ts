import { describe, test, expect } from "vitest";
import { __testing__ } from "./dashboard";

const { getView } = __testing__;

describe("getView", () => {
  test("returns 'search' for search path", () => {
    expect(getView("/dashboard/search", true)).toBe("search");
    expect(getView("/dashboard/search", false)).toBe("search");
  });

  test("returns 'welcome' when no projects", () => {
    expect(getView("/dashboard", false)).toBe("welcome");
    expect(getView("/dashboard/templates", false)).toBe("welcome");
  });

  test("returns 'templates' for templates path with projects", () => {
    expect(getView("/dashboard/templates", true)).toBe("templates");
  });

  test("returns 'projects' for dashboard root with projects", () => {
    expect(getView("/dashboard", true)).toBe("projects");
  });

  test("returns 'projects' for unknown paths with projects", () => {
    expect(getView("/dashboard/unknown", true)).toBe("projects");
  });

  test("search takes priority over welcome", () => {
    // Even with no projects, search view should show
    expect(getView("/dashboard/search", false)).toBe("search");
  });
});
