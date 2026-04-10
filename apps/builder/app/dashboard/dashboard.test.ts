import { describe, test, expect } from "vitest";
import { __testing__ } from "./dashboard";

const { getView } = __testing__;

describe("getView", () => {
  test("returns 'search' for search path", () => {
    expect(getView("/dashboard/search", true, true)).toBe("search");
    expect(getView("/dashboard/search", false, true)).toBe("search");
  });

  test("returns 'welcome' when no projects on default workspace", () => {
    expect(getView("/dashboard", false, true)).toBe("welcome");
    expect(getView("/dashboard/templates", false, true)).toBe("welcome");
  });

  test("returns 'projects' when no projects on non-default workspace", () => {
    // Non-default workspaces should never show the welcome onboarding page
    expect(getView("/dashboard", false, false)).toBe("projects");
  });

  test("returns 'templates' on non-default workspace with no projects", () => {
    expect(getView("/dashboard/templates", false, false)).toBe("templates");
  });

  test("returns 'templates' for templates path with projects", () => {
    expect(getView("/dashboard/templates", true, true)).toBe("templates");
  });

  test("returns 'projects' for dashboard root with projects", () => {
    expect(getView("/dashboard", true, true)).toBe("projects");
  });

  test("returns 'projects' for unknown paths with projects", () => {
    expect(getView("/dashboard/unknown", true, true)).toBe("projects");
  });

  test("search takes priority over welcome", () => {
    // Even with no projects, search view should show
    expect(getView("/dashboard/search", false, true)).toBe("search");
  });
});
