import { describe, expect, test } from "vitest";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import {
  importDesignTokens,
  normalizeDesignTokenImport,
} from "./design-token-import";

const createState = (): BuilderState => ({
  breakpoints: new Map([["base", { id: "base", label: "Base", minWidth: 0 }]]),
  pages: {
    homePageId: "home",
    rootFolderId: "root-folder",
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          title: "",
          path: "",
          rootInstanceId: "root",
          meta: {},
        },
      ],
    ]),
    folders: new Map(),
  },
  styles: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
});

const createId = () => {
  let id = 0;
  return () => `generated-${++id}`;
};

describe("design token import", () => {
  test("normalizes nested DTCG tokens and resolves aliases", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          color: {
            $type: "color",
            primary: { $value: "#123456" },
            action: { $value: "{color.primary}" },
          },
        },
      },
      prefix: "brand",
      collision: "skip",
    });

    expect(tokens).toEqual([
      expect.objectContaining({
        path: "color.primary",
        outputName: "--brand-color-primary",
        cssValue: "#123456",
      }),
      expect.objectContaining({
        path: "color.action",
        outputName: "--brand-color-action",
        cssValue: "#123456",
      }),
    ]);
  });

  test("normalizes Figma Variables API exports and aliases", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "figma",
        modeId: "light",
        document: {
          meta: {
            variables: {
              primary: {
                name: "Color/Primary",
                resolvedType: "COLOR",
                valuesByMode: { light: { r: 1, g: 0, b: 0, a: 1 } },
              },
              action: {
                name: "Color/Action",
                resolvedType: "COLOR",
                valuesByMode: {
                  light: { type: "VARIABLE_ALIAS", id: "primary" },
                },
              },
            },
          },
        },
      },
      collision: "skip",
    });

    expect(tokens.map((token) => [token.outputName, token.cssValue])).toEqual([
      ["--color-primary", "rgb(255 0 0 / 1)"],
      ["--color-action", "rgb(255 0 0 / 1)"],
    ]);
  });

  test("skips collisions without changing the project", () => {
    const state = createState();
    state.styles?.set("root:base:--brand-color:", {
      styleSourceId: "root",
      breakpointId: "base",
      property: "--brand-color",
      value: { type: "unparsed", value: "old" },
    });
    const mutation = importDesignTokens(
      state,
      {
        source: {
          format: "dtcg",
          document: { color: { $type: "color", $value: "#123456" } },
        },
        prefix: "brand",
        collision: "skip",
      },
      { createId: createId() }
    );

    expect(mutation.payload).toEqual([]);
    expect(mutation.result.counts).toEqual({
      create: 0,
      overwrite: 0,
      skip: 1,
    });
  });

  test("imports mapped families through existing mutation operations", () => {
    const state = createState();
    const mutation = importDesignTokens(
      state,
      {
        source: {
          format: "dtcg",
          document: {
            color: {
              $type: "color",
              primary: { $value: "#123456" },
            },
            spacing: {
              $type: "dimension",
              small: { $value: { value: 8, unit: "px" } },
            },
          },
        },
        mapping: {
          color: { target: "design-token", property: "color" },
          dimension: { target: "css-variable" },
        },
        collision: "skip",
      },
      { createId: createId() }
    );
    const updated = applyBuilderPatchTransactions(state, [
      { id: "import", payload: mutation.payload },
    ]).state;

    expect(mutation.result.counts).toEqual({
      create: 2,
      overwrite: 0,
      skip: 0,
    });
    expect(
      Array.from(updated.styleSources?.values() ?? []).find(
        (source) => source.type === "token"
      )
    ).toMatchObject({ name: "color.primary" });
    expect(
      Array.from(updated.styles?.values() ?? []).map((style) => [
        style.property,
        style.value,
      ])
    ).toEqual(
      expect.arrayContaining([
        ["color", { type: "unparsed", value: "#123456" }],
        ["--spacing-small", { type: "unparsed", value: "8px" }],
      ])
    );
  });

  test("rejects missing aliases and unsupported composite values", () => {
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            color: { $type: "color", $value: "{color.missing}" },
          },
        },
        collision: "skip",
      })
    ).toThrow("references missing alias");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            typography: {
              $type: "typography",
              $value: { family: "Inter", size: 16 },
            },
          },
        },
        collision: "skip",
      })
    ).toThrow("cannot be represented as one CSS value");
  });
});
