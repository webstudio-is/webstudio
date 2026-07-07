import { describe, expect, test } from "vitest";
import type { BuilderState } from "../state/builder-state";
import {
  breakpointFieldsInput,
  breakpointUpdateFieldsInput,
  createBreakpoint,
  createRedirect,
  deleteBreakpoint,
  deleteRedirect,
  getProjectSettings,
  listBreakpoints,
  listRedirects,
  projectSettingsUpdateInput,
  redirectFieldsInput,
  redirectUpdateFieldsInput,
  updateBreakpoint,
  updateProjectSettings,
  updateRedirect,
} from "./project-settings";

const createState = (): BuilderState =>
  ({
    pages: {
      meta: { siteName: "Existing site", faviconAssetId: "old-asset" },
      compiler: { atomicStyles: true },
      redirects: [{ old: "/old", new: "/new", status: "301" }],
    },
    breakpoints: new Map([
      ["base", { id: "base", label: "Base" }],
      ["desktop", { id: "desktop", label: "Desktop", minWidth: 1024 }],
    ]),
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
    expect(
      breakpointFieldsInput.parse({ id: "tablet", label: "Tablet" })
    ).toEqual({ id: "tablet", label: "Tablet" });
    expect(breakpointUpdateFieldsInput.parse({ condition: null })).toEqual({
      condition: null,
    });
  });

  test("reads project settings from pages namespace", () => {
    expect(getProjectSettings(createState())).toEqual({
      meta: { siteName: "Existing site", faviconAssetId: "old-asset" },
      compiler: { atomicStyles: true },
      redirects: [{ old: "/old", new: "/new", status: "301" }],
    });
  });

  test("updates project meta and compiler settings", () => {
    expect(
      updateProjectSettings(createState(), {
        meta: { siteName: "New site", faviconAssetId: null },
        compiler: { atomicStyles: false },
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["pages"],
      noop: false,
      result: { updated: true },
      payload: [
        {
          namespace: "pages",
          patches: [
            { op: "replace", path: ["meta", "siteName"], value: "New site" },
            { op: "remove", path: ["meta", "faviconAssetId"] },
            {
              op: "replace",
              path: ["compiler", "atomicStyles"],
              value: false,
            },
          ],
        },
      ],
    });
  });

  test("creates project meta and compiler settings when missing", () => {
    const state = createState();
    if (state.pages === undefined) {
      throw new Error("Expected pages");
    }
    state.pages.meta = undefined;
    state.pages.compiler = undefined;

    expect(
      updateProjectSettings(state, {
        meta: { siteName: "New site", faviconAssetId: null },
        compiler: { atomicStyles: true },
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["pages"],
      noop: false,
      result: { updated: true },
      payload: [
        {
          namespace: "pages",
          patches: [
            { op: "add", path: ["meta"], value: { siteName: "New site" } },
            { op: "add", path: ["compiler"], value: { atomicStyles: true } },
          ],
        },
      ],
    });
  });

  test("ignores unknown project settings fields after validation", () => {
    expect(
      updateProjectSettings(createState(), {
        meta: { unknown: "value" } as never,
        compiler: { unknown: true } as never,
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["pages"],
      noop: true,
      result: { updated: true },
      payload: [],
    });
  });
});

describe("redirect runtime", () => {
  test("lists redirects", () => {
    expect(listRedirects(createState())).toEqual({
      redirects: [{ old: "/old", new: "/new", status: "301" }],
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
});

describe("breakpoint runtime", () => {
  test("lists breakpoints", () => {
    expect(listBreakpoints(createState())).toEqual({
      breakpoints: [
        { id: "base", label: "Base" },
        { id: "desktop", label: "Desktop", minWidth: 1024 },
      ],
    });
  });

  test("creates breakpoint", () => {
    expect(
      createBreakpoint(createState(), {
        id: "tablet",
        label: "Tablet",
        maxWidth: 991,
      })
    ).toEqual({
      kind: "mutation",
      invalidatesNamespaces: ["breakpoints"],
      noop: false,
      result: { breakpointId: "tablet" },
      payload: [
        {
          namespace: "breakpoints",
          patches: [
            {
              op: "add",
              path: ["tablet"],
              value: { id: "tablet", label: "Tablet", maxWidth: 991 },
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
      createBreakpoint(state, {
        id: "overflow",
        label: "Overflow",
        minWidth: 1200,
      })
    ).toThrow("Breakpoint limit reached");
  });

  test("rejects creating a second base breakpoint", () => {
    expect(() =>
      createBreakpoint(createState(), {
        id: "second-base",
        label: "Second base",
      })
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
