import { describe, expect, test } from "vitest";
import type { Folder, Page, Pages } from "@webstudio-is/sdk";
import { ROOT_FOLDER_ID } from "@webstudio-is/sdk";
import type { Values } from "./shared";
import { __testing__ } from "./page-settings";

const {
  addContentModePathError,
  canEditPagePathInMode,
  computePagePath,
  fieldDefaultValues,
  getAuthFromValues,
  getInitialPageMeta,
  toFormValues,
  validateValues,
} = __testing__;

const homePage: Page = {
  id: "home",
  name: "Home",
  path: "",
  title: `"Home"`,
  meta: {},
  rootInstanceId: "home-root",
};

const createPage = (page: Partial<Page> & Pick<Page, "id">): Page => ({
  name: page.id,
  path: `/${page.id}`,
  title: `"${page.id}"`,
  meta: {},
  rootInstanceId: `${page.id}-root`,
  ...page,
});

const createFolder = (
  folder: Partial<Folder> & Pick<Folder, "id">
): Folder => ({
  name: folder.id,
  slug: folder.id,
  children: [],
  ...folder,
});

const createPages = ({
  pages = [homePage],
  folders,
}: {
  pages?: Page[];
  folders?: Folder[];
} = {}): Pages => ({
  homePageId: homePage.id,
  rootFolderId: ROOT_FOLDER_ID,
  pages: new Map(pages.map((page) => [page.id, page])),
  folders: new Map(
    (
      folders ?? [
        createFolder({
          id: ROOT_FOLDER_ID,
          name: "Root",
          slug: "",
          children: pages.map((page) => page.id),
        }),
      ]
    ).map((folder) => [folder.id, folder])
  ),
});

const createValues = (values: Partial<Values> = {}): Values => ({
  ...fieldDefaultValues,
  auth: { ...fieldDefaultValues.auth },
  customMetas: [...fieldDefaultValues.customMetas],
  marketplace: { ...fieldDefaultValues.marketplace },
  ...values,
});

describe("computePagePath", () => {
  test("returns root path for the home page", () => {
    const pages = createPages();
    expect(computePagePath(createValues({ isHomePage: true }), pages)).toBe(
      "/"
    );
  });

  test("combines parent folder path with page path", () => {
    const page = createPage({ id: "post", path: "/post" });
    const pages = createPages({
      pages: [homePage, page],
      folders: [
        createFolder({
          id: ROOT_FOLDER_ID,
          name: "Root",
          slug: "",
          children: ["blog"],
        }),
        createFolder({
          id: "blog",
          slug: "blog",
          children: [page.id],
        }),
      ],
    });

    expect(
      computePagePath(
        createValues({ parentFolderId: "blog", path: "/post" }),
        pages
      )
    ).toBe("/blog/post");
  });
});

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

describe("validateValues", () => {
  test("accumulates duplicate path errors from the general section", () => {
    const currentPage = createPage({ id: "page-id", path: "/current" });
    const existingPage = createPage({ id: "existing", path: "/taken" });

    const errors = validateValues(
      createPages({ pages: [homePage, currentPage, existingPage] }),
      currentPage.id,
      createValues({
        path: "/taken",
      }),
      new Map()
    );

    expect(errors.path).toEqual(["All paths must be unique"]);
  });

  test("accumulates auth errors with other field errors", () => {
    const errors = validateValues(
      createPages(),
      undefined,
      createValues({
        path: "missing-leading-slash",
        auth: {
          login: "admin:root",
          password: "secret phrase",
        },
      }),
      new Map()
    );

    expect(errors.path).toEqual(
      expect.arrayContaining([
        "Must start with a / or a full URL e.g. https://website.org",
      ])
    );
    expect(errors.auth).toEqual({
      login: ["Login can't contain a colon"],
      password: ["Password can't contain whitespace"],
    });
  });

  test("does not require auth when both credentials are empty", () => {
    expect(
      validateValues(createPages(), undefined, createValues(), new Map()).auth
    ).toBeUndefined();
  });

  test("validates only visible document type sections", () => {
    const invalidHtmlMetadata = {
      title: `""`,
      language: `"not a locale"`,
    };

    const textErrors = validateValues(
      createPages(),
      undefined,
      createValues({
        ...invalidHtmlMetadata,
        documentType: "text",
        content: "42",
      }),
      new Map()
    );

    expect(textErrors.title).toBeUndefined();
    expect(textErrors.language).toBeUndefined();
    expect(textErrors.content).toBeDefined();

    const xmlErrors = validateValues(
      createPages(),
      undefined,
      createValues({
        ...invalidHtmlMetadata,
        documentType: "xml",
        content: "42",
      }),
      new Map()
    );

    expect(xmlErrors.title).toBeUndefined();
    expect(xmlErrors.language).toBeUndefined();
    expect(xmlErrors.content).toBeUndefined();
  });

  test("allows redirect on the home page", () => {
    const errors = validateValues(
      createPages(),
      homePage.id,
      createValues({
        isHomePage: true,
        path: "/",
        redirect: `"/test"`,
      }),
      new Map()
    );

    expect(errors.redirect).toBeUndefined();
  });
});

describe("auth form values", () => {
  test("serializes valid auth and omits empty or invalid auth", () => {
    expect(getAuthFromValues(createValues())).toBeUndefined();
    expect(
      getAuthFromValues(
        createValues({
          auth: {
            login: "admin",
            password: "secret",
          },
        })
      )
    ).toEqual({
      method: "basic",
      login: "admin",
      password: "secret",
    });
    expect(
      getAuthFromValues(
        createValues({
          auth: {
            login: "admin:root",
            password: "secret",
          },
        })
      )
    ).toBeUndefined();
  });

  test("omits auth key from initial page meta when auth is empty", () => {
    expect(getInitialPageMeta(createValues())).toEqual({});
    expect(
      getInitialPageMeta(
        createValues({
          auth: {
            login: "admin",
            password: "secret",
          },
        })
      )
    ).toEqual({
      auth: {
        method: "basic",
        login: "admin",
        password: "secret",
      },
    });
  });

  test("maps page auth metadata into form values", () => {
    const page = createPage({
      id: "private",
      meta: {
        auth: {
          method: "basic",
          login: "admin",
          password: "secret",
        },
      },
    });
    const pages = createPages({ pages: [homePage, page] });

    expect(toFormValues(page, pages, false).auth).toEqual({
      login: "admin",
      password: "secret",
    });
  });

  test("maps text content metadata into form values", () => {
    const page = createPage({
      id: "llms",
      meta: {
        documentType: "text",
        content: `"Webstudio text content"`,
      },
    });
    const pages = createPages({ pages: [homePage, page] });

    expect(toFormValues(page, pages, false).content).toBe(
      `"Webstudio text content"`
    );
  });
});
