import { describe, expect, test } from "vitest";
import { __testing__ } from "./page-settings";

const { addContentModePathError, canEditPagePathInMode } = __testing__;

describe("canEditPagePathInMode", () => {
  test("allows design mode to edit every page path", () => {
    expect(
      canEditPagePathInMode({
        isDesignMode: true,
        isContentMode: false,
        path: "/posts/:slug",
      })
    ).toBe(true);
  });

  test("allows content mode to edit only literal paths", () => {
    expect(
      canEditPagePathInMode({
        isDesignMode: false,
        isContentMode: true,
        path: "/about",
      })
    ).toBe(true);
    expect(
      canEditPagePathInMode({
        isDesignMode: false,
        isContentMode: true,
        path: "/posts/:slug",
      })
    ).toBe(false);
    expect(
      canEditPagePathInMode({
        isDesignMode: false,
        isContentMode: true,
        path: "/docs/*",
      })
    ).toBe(false);
  });

  test("disallows path edits outside design and content modes", () => {
    expect(
      canEditPagePathInMode({
        isDesignMode: false,
        isContentMode: false,
        path: "/about",
      })
    ).toBe(false);
  });
});

describe("addContentModePathError", () => {
  test("adds an error only for non-static content-mode paths", () => {
    const errors = {};
    addContentModePathError({
      errors,
      isContentMode: true,
      path: "/posts/:slug",
    });
    expect(errors).toEqual({
      path: ["Editors can only set static page paths"],
    });

    const staticErrors = {};
    addContentModePathError({
      errors: staticErrors,
      isContentMode: true,
      path: "/about",
    });
    expect(staticErrors).toEqual({});

    const designErrors = {};
    addContentModePathError({
      errors: designErrors,
      isContentMode: false,
      path: "/posts/:slug",
    });
    expect(designErrors).toEqual({});
  });
});
