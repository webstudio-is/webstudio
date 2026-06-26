import { describe, expect, test } from "vitest";
import type { StyleDecl } from "@webstudio-is/sdk";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { parseCssValue } from "@webstudio-is/css-data";
import {
  createCssVariableDeletePayload,
  createCssVariableRootDefinePayload,
  createCssVariableReferenceRewritePayload,
  cssVariableValueInput,
  getDefinedCssVariableNames,
  getInstanceIdByStyleSourceId,
  serializeCssVariables,
  validateCssVariableNameWithStyles,
} from "./css-variable-usage";

const createStyleDecl = (
  styleSourceId: string,
  property: string,
  value: string
): StyleDecl => ({
  styleSourceId,
  breakpointId: "base",
  property: property as StyleProperty,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: parseCssValue(property as any, value),
});

describe("css variable usage", () => {
  test("parses css variable values used by the API", () => {
    expect(cssVariableValueInput.parse("10px")).toBe("10px");
    expect(
      cssVariableValueInput.parse({ type: "keyword", value: "red" })
    ).toEqual({
      type: "keyword",
      value: "red",
    });
  });

  test("finds defined css variable names", () => {
    expect(
      getDefinedCssVariableNames([
        createStyleDecl("local", "--color", "red"),
        createStyleDecl("local", "color", "var(--color)"),
      ])
    ).toEqual(new Set(["--color"]));
  });

  test("maps style sources to owning instances", () => {
    expect(
      getInstanceIdByStyleSourceId([
        { instanceId: "box", values: ["token", "local"] },
      ])
    ).toEqual(
      new Map([
        ["token", "box"],
        ["local", "box"],
      ])
    );
  });

  test("validates css variable names", () => {
    expect(
      validateCssVariableNameWithStyles({
        name: "",
        styles: [],
      })
    ).toEqual({
      type: "required",
      message: "CSS variable name cannot be empty",
    });
    expect(
      validateCssVariableNameWithStyles({
        name: "color",
        styles: [],
      })
    ).toEqual({
      type: "invalid",
      message: 'CSS variable name must start with "--"',
    });
    expect(
      validateCssVariableNameWithStyles({
        name: "--color",
        styles: [createStyleDecl("local", "--color", "red")],
      })
    ).toEqual({
      type: "duplicate",
      message: 'CSS variable "--color" already exists',
    });
    expect(
      validateCssVariableNameWithStyles({
        name: "--color",
        currentProperty: "--color",
        styles: [createStyleDecl("local", "--color", "red")],
      })
    ).toBeUndefined();
  });

  test("serializes css variables with scope and usage", () => {
    expect(
      serializeCssVariables({
        styles: [
          createStyleDecl("local", "--color", "red"),
          createStyleDecl("local", "color", "var(--color)"),
        ],
        props: [
          {
            id: "prop",
            instanceId: "box",
            name: "code",
            type: "string",
            value: "var(--color)",
          },
        ],
        styleSourceSelections: [{ instanceId: "box", values: ["local"] }],
        withUsage: true,
      })
    ).toEqual({
      vars: [
        {
          name: "--color",
          value: "red",
          scope: "box",
          usageCount: 2,
        },
      ],
    });
  });

  test("creates root css variable define payload with local style source", () => {
    const result = createCssVariableRootDefinePayload({
      rootInstanceId: "body",
      vars: { "--color": "red" },
      styleSources: new Map(),
      styleSourceSelections: [],
      styles: [],
    });

    const localStyleSourceId = result.styleKeys[0]?.split(":")[0];
    expect(localStyleSourceId).toEqual(expect.any(String));
    expect(result).toEqual({
      payload: [
        {
          namespace: "styleSources",
          patches: [
            {
              op: "add",
              path: [localStyleSourceId],
              value: { type: "local", id: localStyleSourceId },
            },
          ],
        },
        {
          namespace: "styleSourceSelections",
          patches: [
            {
              op: "add",
              path: ["body"],
              value: { instanceId: "body", values: [localStyleSourceId] },
            },
          ],
        },
        {
          namespace: "styles",
          patches: [
            {
              op: "add",
              path: [`${localStyleSourceId}:base:--color:`],
              value: {
                styleSourceId: localStyleSourceId,
                breakpointId: "base",
                property: "--color",
                value: { type: "unparsed", value: "red" },
              },
            },
          ],
        },
      ],
      names: ["--color"],
      conflicts: [],
      styleKeys: [`${localStyleSourceId}:base:--color:`],
      missingRootStyleSource: false,
    });
  });

  test("reports css variable define conflicts and overwrites when requested", () => {
    const existing = createStyleDecl("local", "--color", "red");
    expect(
      createCssVariableRootDefinePayload({
        rootInstanceId: "body",
        vars: { "--color": "blue" },
        styleSources: new Map([["local", { id: "local", type: "local" }]]),
        styleSourceSelections: [{ instanceId: "body", values: ["local"] }],
        styles: [existing],
      }).conflicts
    ).toEqual(["--color"]);

    expect(
      createCssVariableRootDefinePayload({
        rootInstanceId: "body",
        vars: { "--color": "blue" },
        styleSources: new Map([["local", { id: "local", type: "local" }]]),
        styleSourceSelections: [{ instanceId: "body", values: ["local"] }],
        styles: [existing],
        overwrite: true,
      }).payload
    ).toEqual([
      {
        namespace: "styles",
        patches: [
          {
            op: "replace",
            path: ["local:base:--color:"],
            value: {
              ...existing,
              value: { type: "unparsed", value: "blue" },
            },
          },
        ],
      },
    ]);
  });

  test("creates css variable delete patches and reports references", () => {
    const styles = [
      createStyleDecl("local", "--color", "red"),
      createStyleDecl("local", "color", "var(--color)"),
    ];
    expect(
      createCssVariableDeletePayload({
        names: ["--color"],
        styles,
        props: [],
      })
    ).toEqual({
      payload: [],
      styleKeys: [],
      referenced: ["--color"],
    });

    expect(
      createCssVariableDeletePayload({
        names: ["--color"],
        styles,
        props: [],
        force: true,
      })
    ).toEqual({
      payload: [
        {
          namespace: "styles",
          patches: [{ op: "remove", path: ["local:base:--color:"] }],
        },
      ],
      styleKeys: ["local:base:--color:"],
      referenced: [],
    });
  });

  test("creates scoped css variable reference rewrite patches", () => {
    expect(
      createCssVariableReferenceRewritePayload({
        replacements: { "--old": "--new" },
        scopeRegex: /^box$/,
        styles: [
          createStyleDecl("local", "color", "var(--old)"),
          createStyleDecl("other-local", "color", "var(--old)"),
        ],
        props: [
          {
            id: "prop",
            instanceId: "box",
            name: "code",
            type: "string",
            value: "var(--old)",
          },
        ],
        styleSourceSelections: [
          { instanceId: "box", values: ["local"] },
          { instanceId: "other", values: ["other-local"] },
        ],
      })
    ).toEqual({
      payload: [
        {
          namespace: "styles",
          patches: [
            {
              op: "replace",
              path: ["local:base:color:"],
              value: createStyleDecl("local", "color", "var(--new)"),
            },
          ],
        },
        {
          namespace: "props",
          patches: [
            {
              op: "replace",
              path: ["prop"],
              value: {
                id: "prop",
                instanceId: "box",
                name: "code",
                type: "string",
                value: "var(--new)",
              },
            },
          ],
        },
      ],
      styleKeys: ["local:base:color:"],
      propIds: ["prop"],
    });
  });
});
