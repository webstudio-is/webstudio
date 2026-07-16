import { describe, expect, test } from "vitest";
import { createBasicAuthRoute } from "@webstudio-is/wsauth";
import type { BuilderState } from "../state/builder-state";
import {
  parseProjectAuthRoutes,
  validateContactEmail,
  validateProjectAuth,
  validateProjectAuthRoute,
} from "../contracts/project-settings";
import {
  breakpointFieldsInput,
  breakpointUpdateFieldsInput,
  createBreakpoint,
  createRedirect,
  deleteBreakpoint,
  deleteRedirect,
  getMarketplaceProduct,
  getProjectSettings,
  listBreakpoints,
  listRedirects,
  marketplaceProductUpdateInput,
  projectSettingsUpdateInput,
  redirectFieldsInput,
  redirectUpdateFieldsInput,
  setRedirects,
  updateBreakpoint,
  updateMarketplaceProduct,
  updateProjectSettings,
  updateRedirect,
} from "./project-settings";

const createState = (): BuilderState =>
  ({
    pages: {
      redirects: [{ old: "/old", new: "/new", status: "301" }],
    },
    projectSettings: {
      meta: { siteName: "Existing site", faviconAssetId: "old-asset" },
      compiler: { atomicStyles: true },
    },
    breakpoints: new Map([
      ["base", { id: "base", label: "Base" }],
      ["desktop", { id: "desktop", label: "Desktop", minWidth: 1024 }],
    ]),
    marketplaceProduct: {
      category: "pageTemplates",
      name: "Existing Marketplace Product",
      thumbnailAssetId: "asset-id",
      author: "Webstudio",
      email: "hello@webstudio.is",
      website: "",
      issues: "",
      description: "Existing marketplace product description.",
    },
    styles: new Map([
      [
        "local:desktop:color",
        {
          breakpointId: "desktop",
          styleSourceId: "local",
          state: undefined,
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
      [
        "local:base:color",
        {
          breakpointId: "base",
          styleSourceId: "local",
          state: undefined,
          property: "color",
          value: { type: "keyword", value: "blue" },
        },
      ],
    ]),
  }) as BuilderState;

const context = {
  createId: () => "generated-id",
};

describe("project settings runtime", () => {
  test("exports reusable input contracts for router adapters", () => {
    expect(
      projectSettingsUpdateInput.parse({
        meta: { siteName: "Site", faviconAssetId: null },
        compiler: { atomicStyles: false },
      })
    ).toEqual({
      meta: { siteName: "Site", faviconAssetId: null },
      compiler: { atomicStyles: false },
    });
    expect(
      redirectFieldsInput.safeParse({
        old: "/old",
        new: "/new",
        status: "308",
      }).success
    ).toBe(false);
    expect(redirectUpdateFieldsInput.parse({ status: null })).toMatchObject({
      status: null,
    });
    expect(breakpointFieldsInput.parse({ label: "Tablet" })).toEqual({
      label: "Tablet",
    });
    expect(
      breakpointFieldsInput.safeParse({ id: "tablet", label: "Tablet" }).success
    ).toBe(false);
    expect(
      breakpointFieldsInput.safeParse({ label: "Tablet", minWidth: -1 }).success
    ).toBe(false);
    expect(breakpointUpdateFieldsInput.parse({ condition: null })).toEqual({
      condition: null,
    });
    expect(
      breakpointUpdateFieldsInput.safeParse({ maxWidth: -1 }).success
    ).toBe(false);
    expect(
      marketplaceProductUpdateInput.parse({
        category: "sectionTemplates",
        name: "Marketplace Product",
        thumbnailAssetId: "asset-id",
        author: "Webstudio",
        email: "hello@webstudio.is",
        website: "",
        issues: "",
        description: "Reusable marketplace product description.",
      })
    ).toMatchObject({
      category: "sectionTemplates",
      name: "Marketplace Product",
    });
  });

  test("reads project settings from their first-class namespace", () => {
    expect(getProjectSettings(createState())).toEqual({
      meta: { siteName: "Existing site", faviconAssetId: "old-asset" },
      compiler: { atomicStyles: true },
    });
    expect(getProjectSettings(createState(), { verbose: true })).toEqual({
      meta: { siteName: "Existing site", faviconAssetId: "old-asset" },
      compiler: { atomicStyles: true },
      redirects: [{ old: "/old", new: "/new", status: "301" }],
    });
  });

  test("updates project meta and compiler settings", () => {
    const mutation = updateProjectSettings(createState(), {
      meta: {
        siteName: "New site",
        faviconAssetId: null,
        agentInstructions: "Use existing design tokens.",
      },
      compiler: { atomicStyles: false },
    });

    expect(mutation).toMatchObject({
      kind: "mutation",
      invalidatesNamespaces: ["projectSettings"],
      noop: false,
      result: { updated: true },
      payload: [{ namespace: "projectSettings" }],
    });
    const patches = mutation.payload[0]?.patches;
    expect(patches).toHaveLength(4);
    expect(patches).toEqual(
      expect.arrayContaining([
        { op: "replace", path: ["meta", "siteName"], value: "New site" },
        {
          op: "add",
          path: ["meta", "agentInstructions"],
          value: "Use existing design tokens.",
        },
        { op: "remove", path: ["meta", "faviconAssetId"] },
        {
          op: "replace",
          path: ["compiler", "atomicStyles"],
          value: false,
        },
      ])
    );
  });

  test("validates contact email through shared project settings helper", () => {
    expect(validateContactEmail("hello@webstudio.is")).toBeUndefined();
    expect(
      validateContactEmail("hello@webstudio.is, support@webstudio.is")
    ).toBeUndefined();
    expect(validateContactEmail("")).toBeUndefined();
    expect(validateContactEmail("not-an-email")).toBe(
      "Contact email is invalid."
    );
    expect(validateContactEmail("hello@webstudio.is", 0)).toBe(
      "Upgrade to PRO to customize the contact email."
    );
    expect(
      validateContactEmail("hello@webstudio.is, support@webstudio.is", 1)
    ).toBe("Only 1 emails are allowed.");
  });

  test("rejects invalid project contact email updates", () => {
    expect(() =>
      updateProjectSettings(createState(), {
        meta: { contactEmail: "not-an-email" },
      })
    ).toThrow("Contact email is invalid.");
  });

  test("validates serialized project auth config", () => {
    const auth = JSON.stringify({
      version: 1,
      routes: {
        "/private": {
          method: "basic",
          login: "admin",
          password: "secret",
        },
      },
    });
    expect(validateProjectAuth(auth)).toBeUndefined();
    expect(validateProjectAuth("{")).toContain("$: Expected property name");
    expect(
      validateProjectAuth(
        JSON.stringify({
          version: 1,
          routes: {
            private: {
              method: "basic",
              login: "admin",
              password: "secret",
            },
          },
        })
      )
    ).toBe('routes."private": Route must start with "/"');
  });

  test("parses stored auth config into editable routes", () => {
    expect(
      parseProjectAuthRoutes(
        JSON.stringify({
          version: 1,
          routes: {
            "/private": {
              method: "basic",
              login: "admin",
              password: "secret",
            },
          },
        })
      ).routes
    ).toEqual([
      createBasicAuthRoute({
        route: "/private",
        login: "admin",
        password: "secret",
      }),
    ]);
  });

  test("validates project auth route input", () => {
    const authRoutes = [
      createBasicAuthRoute({
        route: "/private",
        login: "admin",
        password: "secret",
      }),
    ];

    expect(validateProjectAuthRoute("", authRoutes)).toEqual([
      "Route is required",
    ]);
    expect(validateProjectAuthRoute("private", authRoutes)).toEqual([
      'Route must start with "/"',
    ]);
    expect(validateProjectAuthRoute("/private", authRoutes)).toEqual([
      "This route already requires authentication",
    ]);
    expect(validateProjectAuthRoute("/docs/*", authRoutes)).toEqual([]);
  });

  test("rejects invalid project auth updates", () => {
    expect(() =>
      updateProjectSettings(createState(), {
        meta: {
          auth: JSON.stringify({
            version: 1,
            routes: {
              private: {
                method: "basic",
                login: "admin",
                password: "secret",
              },
            },
          }),
        },
      })
    ).toThrow('routes."private": Route must start with "/"');
  });

  test("creates project meta and compiler settings when missing", () => {
    const state = createState();
    if (state.projectSettings === undefined) {
      throw new Error("Expected project settings");
    }
    state.projectSettings.meta = {};
    state.projectSettings.compiler = {};

    expect(
      updateProjectSettings(state, {
        meta: { siteName: "New site", faviconAssetId: null },
        compiler: { atomicStyles: true },
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["projectSettings"],
      noop: false,
      result: { updated: true },
      payload: [
        {
          namespace: "projectSettings",
          patches: [
            { op: "add", path: ["meta", "siteName"], value: "New site" },
            {
              op: "add",
              path: ["compiler", "atomicStyles"],
              value: true,
            },
          ],
        },
      ],
    });
  });

  test("rejects empty and unknown project settings updates", () => {
    expect(projectSettingsUpdateInput.safeParse({}).success).toBe(false);
    expect(
      projectSettingsUpdateInput.safeParse({ meta: {}, compiler: {} }).success
    ).toBe(false);
    expect(
      projectSettingsUpdateInput.safeParse({
        meta: { unknown: "value" },
      }).success
    ).toBe(false);
  });

  test("reports same-value project settings updates as unchanged", () => {
    expect(
      updateProjectSettings(createState(), {
        meta: { siteName: "Existing site" },
        compiler: { atomicStyles: true },
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: [],
      noop: true,
      result: { updated: false },
      payload: [],
    });
  });

  test("updates marketplace product through runtime payload", () => {
    const nextMarketplaceProduct = {
      category: "sectionTemplates" as const,
      name: "New Marketplace Product",
      thumbnailAssetId: "new-asset-id",
      author: "Webstudio",
      email: "hello@webstudio.is",
      website: "https://webstudio.is",
      issues: "",
      description: "A reusable section template for marketplace testing.",
    };

    expect(
      updateMarketplaceProduct(createState(), nextMarketplaceProduct)
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["marketplaceProduct"],
      noop: false,
      result: { updated: true },
      payload: [
        {
          namespace: "marketplaceProduct",
          patches: [{ op: "replace", path: [], value: nextMarketplaceProduct }],
        },
      ],
    });
  });

  test("gets marketplace product", () => {
    const state = createState();
    expect(getMarketplaceProduct(state)).toEqual({
      marketplaceProduct: state.marketplaceProduct,
    });
  });
});

describe("redirect runtime", () => {
  test("lists redirects", () => {
    expect(listRedirects(createState())).toEqual({
      redirects: [{ old: "/old", new: "/new", status: "301" }],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: {},
    });
  });

  test("creates redirect", () => {
    expect(
      createRedirect(createState(), { old: "/from", new: "/to", status: "302" })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["pages"],
      noop: false,
      result: { old: "/from" },
      payload: [
        {
          namespace: "pages",
          patches: [
            {
              op: "add",
              path: ["redirects", 1],
              value: { old: "/from", new: "/to", status: "302" },
            },
          ],
        },
      ],
    });
  });

  test("rejects duplicate redirect sources after normalization", () => {
    expect(() =>
      createRedirect(createState(), {
        old: "/old#fragment",
        new: "/other",
      })
    ).toThrow("Redirect already exists");

    expect(() =>
      setRedirects(createState(), {
        redirects: [
          { old: "/über", new: "/one" },
          { old: "/%C3%BCber", new: "/two" },
        ],
      })
    ).toThrow('Duplicate redirect source "/%C3%BCber"');
  });

  test("rejects unsupported redirect source and target param combinations", () => {
    expect(() =>
      createRedirect(createState(), {
        old: "/docs/:slug*",
        new: "/docs",
      })
    ).toThrow("Named splats are not supported");

    expect(() =>
      createRedirect(createState(), {
        old: "/docs/:slug",
        new: "/articles/:id",
      })
    ).toThrow("Target route params must match params from the source path");
  });

  test("updates redirect and can remove status", () => {
    expect(
      updateRedirect(createState(), {
        old: "/old",
        values: { old: "/older", new: "/newer", status: null },
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["pages"],
      noop: false,
      result: { old: "/older" },
      payload: [
        {
          namespace: "pages",
          patches: [
            { op: "replace", path: ["redirects", 0, "old"], value: "/older" },
            { op: "replace", path: ["redirects", 0, "new"], value: "/newer" },
            { op: "remove", path: ["redirects", 0, "status"] },
          ],
        },
      ],
    });
  });

  test("deletes redirect", () => {
    expect(deleteRedirect(createState(), { old: "/old" })).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["pages"],
      noop: false,
      result: { old: "/old" },
      payload: [
        {
          namespace: "pages",
          patches: [{ op: "remove", path: ["redirects", 0] }],
        },
      ],
    });
  });

  test("sets all redirects", () => {
    expect(
      setRedirects(createState(), {
        redirects: [
          { old: "/first", new: "/target", status: "301" },
          { old: "/second", new: "/other" },
        ],
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["pages"],
      noop: false,
      result: { count: 2 },
      payload: [
        {
          namespace: "pages",
          patches: [
            {
              op: "replace",
              path: ["redirects"],
              value: [
                { old: "/first", new: "/target", status: "301" },
                { old: "/second", new: "/other" },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe("breakpoint runtime", () => {
  test("lists breakpoints", () => {
    expect(listBreakpoints(createState())).toEqual({
      breakpoints: [
        { id: "base", label: "Base" },
        { id: "desktop", label: "Desktop", minWidth: 1024 },
      ],
      detail: "compact",
      total: 2,
      returnedCount: 2,
      nextCursor: null,
      filters: {},
    });
  });

  test("creates breakpoint", () => {
    expect(
      createBreakpoint(
        createState(),
        {
          label: "Tablet",
          maxWidth: 991,
        },
        context
      )
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["breakpoints"],
      noop: false,
      result: { breakpointId: "generated-id" },
      payload: [
        {
          namespace: "breakpoints",
          patches: [
            {
              op: "add",
              path: ["generated-id"],
              value: {
                id: "generated-id",
                label: "Tablet",
                maxWidth: 991,
              },
            },
          ],
        },
      ],
    });
  });

  test("rejects creating more editable breakpoints than Builder allows", () => {
    const state = createState();
    const breakpoints = state.breakpoints;
    if (breakpoints === undefined) {
      throw new Error("Expected breakpoints");
    }
    for (let index = 0; index < 7; index += 1) {
      breakpoints.set(`extra-${index}`, {
        id: `extra-${index}`,
        label: `Extra ${index}`,
        minWidth: index + 1,
      });
    }

    expect(() =>
      createBreakpoint(
        state,
        {
          label: "Overflow",
          minWidth: 1200,
        },
        context
      )
    ).toThrow("Breakpoint limit reached");
  });

  test("rejects creating a second base breakpoint", () => {
    expect(() =>
      createBreakpoint(
        createState(),
        {
          label: "Second base",
        },
        context
      )
    ).toThrow("Base breakpoint already exists");
  });

  test("updates breakpoint", () => {
    expect(
      updateBreakpoint(createState(), {
        breakpointId: "desktop",
        values: { label: "Large", minWidth: 1200 },
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["breakpoints"],
      noop: false,
      result: { breakpointId: "desktop" },
      payload: [
        {
          namespace: "breakpoints",
          patches: [
            {
              op: "replace",
              path: ["desktop"],
              value: { id: "desktop", label: "Large", minWidth: 1200 },
            },
          ],
        },
      ],
    });
  });

  test("updates breakpoint and can clear width or condition fields", () => {
    const state = createState();
    const breakpoints = state.breakpoints;
    if (breakpoints === undefined) {
      throw new Error("Expected breakpoints");
    }
    breakpoints.set("custom", {
      id: "custom",
      label: "Custom",
      condition: "(hover: hover)",
    });

    expect(
      updateBreakpoint(state, {
        breakpointId: "custom",
        values: { condition: null, maxWidth: 767 },
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["breakpoints"],
      noop: false,
      result: { breakpointId: "custom" },
      payload: [
        {
          namespace: "breakpoints",
          patches: [
            {
              op: "replace",
              path: ["custom"],
              value: { id: "custom", label: "Custom", maxWidth: 767 },
            },
          ],
        },
      ],
    });
  });

  test("rejects updating or deleting the base breakpoint", () => {
    expect(() =>
      updateBreakpoint(createState(), {
        breakpointId: "base",
        values: { label: "New base" },
      })
    ).toThrow("Base breakpoint cannot be updated");

    expect(() =>
      deleteBreakpoint(createState(), { breakpointId: "base" })
    ).toThrow("Base breakpoint cannot be deleted");
  });

  test("deletes breakpoint and its style declarations", () => {
    expect(
      deleteBreakpoint(createState(), { breakpointId: "desktop" })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["breakpoints", "styles"],
      noop: false,
      result: { breakpointId: "desktop" },
      payload: [
        {
          namespace: "breakpoints",
          patches: [{ op: "remove", path: ["desktop"] }],
        },
        {
          namespace: "styles",
          patches: [{ op: "remove", path: ["local:desktop:color"] }],
        },
      ],
    });
  });
});
