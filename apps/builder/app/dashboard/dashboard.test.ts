import { describe, test, expect } from "vitest";
import { __testing__ } from "./dashboard";

const { getView } = __testing__;

describe("getView", () => {
  test("returns 'search' for search path", () => {
    expect(getView("/dashboard/search", true, false)).toBe("search");
    expect(getView("/dashboard/search", false, false)).toBe("search");
  });

  test("returns 'welcome' when no projects and workspace not suspended", () => {
    expect(getView("/dashboard", false, false)).toBe("welcome");
  });

  test("returns 'projects' when workspace is suspended with no projects", () => {
    expect(getView("/dashboard", false, true)).toBe("projects");
  });

  test("returns 'projects' when there are projects", () => {
    expect(getView("/dashboard", true, false)).toBe("projects");
    expect(getView("/dashboard", true, true)).toBe("projects");
  });

  test("returns 'projects' for unknown paths with projects", () => {
    expect(getView("/dashboard/unknown", true, false)).toBe("projects");
  });
});
