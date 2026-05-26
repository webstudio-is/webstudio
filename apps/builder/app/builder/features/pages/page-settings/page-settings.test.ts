import { describe, expect, test, vi } from "vitest";
import type { Folder, Page, Pages } from "@webstudio-is/sdk";
import { ROOT_FOLDER_ID } from "@webstudio-is/sdk";
import type { Values } from "./shared";

const mocks = vi.hoisted(() => ({
  isPathAvailable: vi.fn(() => true),
}));

vi.mock("@webstudio-is/design-system", () => {
  const Component = () => null;
  return {
    theme: { spacing: { 10: "" } },
    rawTheme: { spacing: { 26: "", 35: "" } },
    Button: Component,
    Box: Component,
    Checkbox: Component,
    CheckboxAndLabel: Component,
    Flex: Component,
    Tooltip: Component,
    Grid: Component,
    InputErrorsTooltip: Component,
    InputField: Component,
    Label: Component,
    ProBadge: Component,
    Select: Component,
    Text: Component,
    TextArea: Component,
    ScrollArea: Component,
    Link: Component,
    PanelBanner: Component,
    TitleSuffixSpacer: Component,
    DialogClose: Component,
    DialogTitle: Component,
    DialogTitleActions: Component,
    toast: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    buttonStyle: () => "",
    css: () => () => "",
  };
});

vi.mock("@webstudio-is/icons", () => ({
  CopyIcon: () => null,
  HomeIcon: () => null,
  InfoCircleIcon: () => null,
  TrashIcon: () => null,
  UploadIcon: () => null,
}));

vi.mock("~/builder/shared/binding-popover", () => ({
  BindingControl: () => null,
  BindingPopover: () => null,
}));

vi.mock("~/builder/shared/collapsible-section", () => ({
  CollapsibleSection: () => null,
}));

vi.mock("~/shared/project-settings", () => ({
  ImageControl: () => null,
}));

vi.mock("~/shared/project-settings/utils", () => ({
  findMatchingRedirect: () => undefined,
}));

vi.mock("../form", () => ({
  Form: () => null,
}));

vi.mock("../custom-metadata", () => ({
  CustomMetadata: () => null,
}));

vi.mock("../image-info", () => ({
  ImageInfo: () => null,
}));

vi.mock("../search-preview", () => ({
  SearchPreview: () => null,
}));

vi.mock("../social-preview", () => ({
  SocialPreview: () => null,
}));

vi.mock("../page-utils", () => ({
  registerFolderChildMutable: () => undefined,
  cleanupChildRefsMutable: () => undefined,
  duplicatePage: () => undefined,
  isPathAvailable: mocks.isPathAvailable,
  $pageRootScope: {
    get: () => ({ variableValues: new Map(), scope: {}, aliases: new Map() }),
    subscribe: () => () => undefined,
  },
}));

vi.mock("./section-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./section-auth")>()),
  AuthSection: () => null,
}));

vi.mock("./section-custom-metadata", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./section-custom-metadata")>()),
  CustomMetadataSection: () => null,
}));

vi.mock("./section-general", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./section-general")>()),
  GeneralSection: () => null,
}));

vi.mock("./section-marketplace", () => ({
  MarketplaceSection: () => null,
}));

vi.mock("./section-search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./section-search")>()),
  SearchSection: () => null,
}));

vi.mock("./section-social-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./section-social-image")>()),
  SocialImageSection: () => null,
}));

import { __testing__ } from "./page-settings";

const {
  computePagePath,
  fieldDefaultValues,
  getAuthFromValues,
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

describe("validateValues", () => {
  test("accumulates duplicate path errors from the general section", () => {
    mocks.isPathAvailable.mockReturnValueOnce(false);

    const errors = validateValues(
      createPages(),
      "page-id",
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
});
