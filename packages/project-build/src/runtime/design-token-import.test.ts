import { describe, expect, test } from "vitest";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import {
  detectDesignTokenSource,
  designTokenImportInput,
  importDesignTokens,
  normalizeDesignTokenImport,
  planDesignTokenImport,
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

const setupRootStyleSource = (state: BuilderState) => {
  state.styleSources?.set("root-local", {
    id: "root-local",
    type: "local",
  });
  state.styleSourceSelections?.set("root", {
    instanceId: "root",
    values: ["root-local"],
  });
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
        mode: "light",
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

  test("detects Figma and DTCG documents without claiming arbitrary JSON", () => {
    const dtcg = { color: { $type: "color", $value: "#123456" } };
    const dtcgRoot = {
      spacing: {
        $type: "dimension",
        $root: { $value: { value: 8, unit: "px" } },
      },
    };
    const dtcgReference = {
      alias: { $type: "color", $ref: "#/color" },
    };
    const figma = {
      meta: {
        variables: {
          primary: {
            name: "Color/Primary",
            valuesByMode: { light: "#fff" },
          },
        },
      },
    };

    expect(detectDesignTokenSource(dtcg)).toEqual({
      format: "dtcg",
      document: dtcg,
    });
    expect(detectDesignTokenSource(dtcgRoot)).toEqual({
      format: "dtcg",
      document: dtcgRoot,
    });
    expect(detectDesignTokenSource(dtcgReference)).toEqual({
      format: "dtcg",
      document: dtcgReference,
    });
    expect(detectDesignTokenSource(figma)).toEqual({
      format: "figma",
      document: figma,
    });
    expect(detectDesignTokenSource({ color: "red" })).toBeUndefined();
    expect(
      detectDesignTokenSource({
        properties: { user: { $ref: "#/definitions/User" } },
      })
    ).toBeUndefined();
    expect(
      detectDesignTokenSource({ metadata: { $value: "not-a-token" } })
    ).toBeUndefined();
  });

  test("supports DTCG root tokens, inherited types, and both alias syntaxes", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          spacing: {
            $type: "dimension",
            $root: { $value: { value: 8, unit: "px" } },
            compact: { $value: "{spacing.$root}" },
            roomy: { $ref: "#/spacing/$root/$value" },
          },
        },
      },
      collision: "skip",
    });

    expect(
      tokens.map(({ path, type, cssValue }) => [path, type, cssValue])
    ).toEqual([
      ["spacing", "dimension", "8px"],
      ["spacing.compact", "dimension", "8px"],
      ["spacing.roomy", "dimension", "8px"],
    ]);
  });

  test("converts DTCG primitive values that have direct CSS equivalents", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          duration: { $type: "duration", $value: { value: 150, unit: "ms" } },
          easing: { $type: "cubicBezier", $value: [0.1, 0.2, 0.3, 1] },
          firstControl: { $type: "number", $ref: "#/easing/$value/0" },
          family: { $type: "fontFamily", $value: ["Inter", "sans-serif"] },
          alpha: { $type: "number", $value: 0.5 },
          color: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0.1, 0.2, 0.3],
              alpha: { $ref: "#/alpha/$value" },
            },
          },
        },
      },
      collision: "skip",
    });

    expect(tokens.map(({ path, cssValue }) => [path, cssValue])).toEqual([
      ["duration", "150ms"],
      ["easing", "cubic-bezier(0.1, 0.2, 0.3, 1)"],
      ["firstControl", "0.1"],
      ["family", '"Inter", sans-serif'],
      ["alpha", "0.5"],
      ["color", "rgb(26 51 77 / 0.5)"],
    ]);
  });

  test.each([
    ["srgb", [0.1, 0.2, 0.3], "rgb(26 51 77 / 0.5)"],
    ["srgb-linear", [0.1, 0.2, 0.3], "color(srgb-linear 0.1 0.2 0.3 / 0.5)"],
    ["hsl", [120, 50, 60], "hsl(120 50% 60% / 0.5)"],
    ["hwb", [120, 20, 30], "hwb(120 20% 30% / 0.5)"],
    ["lab", [50, 10, -10], "lab(50% 10 -10 / 0.5)"],
    ["lch", [50, 20, 120], "lch(50% 20 120 / 0.5)"],
    ["oklab", [0.5, 0.1, -0.1], "oklab(0.5 0.1 -0.1 / 0.5)"],
    ["oklch", [0.5, 0.2, 120], "oklch(0.5 0.2 120 / 0.5)"],
    ["display-p3", [0.1, 0.2, 0.3], "color(display-p3 0.1 0.2 0.3 / 0.5)"],
    ["a98-rgb", [0.1, 0.2, 0.3], "color(a98-rgb 0.1 0.2 0.3 / 0.5)"],
    ["prophoto-rgb", [0.1, 0.2, 0.3], "color(prophoto-rgb 0.1 0.2 0.3 / 0.5)"],
    ["rec2020", [0.1, 0.2, 0.3], "color(rec2020 0.1 0.2 0.3 / 0.5)"],
    ["xyz-d65", [0.1, 0.2, 0.3], "color(xyz-d65 0.1 0.2 0.3 / 0.5)"],
    ["xyz-d50", [0.1, 0.2, 0.3], "color(xyz-d50 0.1 0.2 0.3 / 0.5)"],
    ["srgb", ["none", 0.2, 0.3], "color(srgb none 0.2 0.3 / 0.5)"],
    ["hsl", ["none", 50, 60], "hsl(none 50% 60% / 0.5)"],
  ] as const)(
    "serializes DTCG %s colors",
    (colorSpace, components, expected) => {
      const [token] = normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            color: {
              $type: "color",
              $value: { colorSpace, components, alpha: 0.5 },
            },
          },
        },
        collision: "skip",
      });

      expect(token.cssValue).toBe(expected);
    }
  );

  test("selects Figma modes by name across variable collections", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "figma",
        mode: "Dark",
        document: {
          meta: {
            variableCollections: {
              palette: {
                defaultModeId: "palette-light",
                modes: [
                  { modeId: "palette-light", name: "Light" },
                  { modeId: "palette-dark", name: "Dark" },
                ],
              },
              semantic: {
                defaultModeId: "semantic-light",
                modes: [
                  { modeId: "semantic-light", name: "Light" },
                  { modeId: "semantic-dark", name: "Dark" },
                ],
              },
            },
            variables: {
              primary: {
                name: "Color/Primary",
                resolvedType: "COLOR",
                variableCollectionId: "palette",
                valuesByMode: {
                  "palette-light": { r: 1, g: 1, b: 1 },
                  "palette-dark": { r: 0, g: 0, b: 0 },
                },
              },
              action: {
                name: "Color/Action",
                resolvedType: "COLOR",
                variableCollectionId: "semantic",
                valuesByMode: {
                  "semantic-light": {
                    type: "VARIABLE_ALIAS",
                    id: "primary",
                  },
                  "semantic-dark": {
                    type: "VARIABLE_ALIAS",
                    id: "primary",
                  },
                },
              },
            },
          },
        },
      },
      collision: "skip",
    });

    expect(
      tokens.map(({ outputName, cssValue }) => [outputName, cssValue])
    ).toEqual([
      ["--color-primary", "rgb(0 0 0 / 1)"],
      ["--color-action", "rgb(0 0 0 / 1)"],
    ]);
  });

  test("imports every Figma mode under deterministic mode-qualified names", () => {
    const document = {
      meta: {
        variableCollections: {
          palette: {
            defaultModeId: "light",
            modes: [
              { modeId: "light", name: "Light" },
              { modeId: "dark", name: "Dark" },
            ],
          },
        },
        variables: {
          primary: {
            name: "Color/Primary",
            resolvedType: "COLOR",
            variableCollectionId: "palette",
            valuesByMode: {
              light: { r: 1, g: 1, b: 1 },
              dark: { r: 0, g: 0, b: 0 },
            },
          },
          action: {
            name: "Color/Action",
            resolvedType: "COLOR",
            variableCollectionId: "palette",
            valuesByMode: {
              light: { type: "VARIABLE_ALIAS", id: "primary" },
              dark: { type: "VARIABLE_ALIAS", id: "primary" },
            },
          },
        },
      },
    };

    expect(
      normalizeDesignTokenImport({
        source: { format: "figma", document, allModes: true },
        collision: "skip",
      }).map(({ outputName, cssValue }) => [outputName, cssValue])
    ).toEqual([
      ["--color-primary-light", "rgb(255 255 255 / 1)"],
      ["--color-primary-dark", "rgb(0 0 0 / 1)"],
      ["--color-action-light", "rgb(255 255 255 / 1)"],
      ["--color-action-dark", "rgb(0 0 0 / 1)"],
    ]);
    expect(() =>
      designTokenImportInput.parse({
        source: { format: "figma", document, mode: "Light", allModes: true },
        collision: "skip",
      })
    ).toThrow("cannot specify both mode and allModes");
  });

  test("uses Figma collection defaults and rejects unavailable explicit modes", () => {
    const document = {
      meta: {
        variableCollections: {
          palette: {
            defaultModeId: "dark",
            modes: [
              { modeId: "light", name: "Light" },
              { modeId: "dark", name: "Dark" },
            ],
          },
        },
        variables: {
          primary: {
            name: "Color/Primary",
            resolvedType: "COLOR",
            variableCollectionId: "palette",
            valuesByMode: { light: "white", dark: "black" },
          },
        },
      },
    };
    expect(
      normalizeDesignTokenImport({
        source: { format: "figma", document },
        collision: "skip",
      })[0]?.cssValue
    ).toBe("black");
    expect(() =>
      normalizeDesignTokenImport({
        source: { format: "figma", document, mode: "High contrast" },
        collision: "skip",
      })
    ).toThrow('has no value for mode "High contrast"');
  });

  test("rejects missing and circular Figma aliases", () => {
    const variable = (id: string) => ({
      name: id,
      resolvedType: "COLOR",
      valuesByMode: {
        mode: { type: "VARIABLE_ALIAS", id },
      },
    });
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "figma",
          document: { variables: { source: variable("missing") } },
        },
        collision: "skip",
      })
    ).toThrow("references missing alias missing");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "figma",
          document: {
            variables: {
              first: variable("second"),
              second: variable("first"),
            },
          },
        },
        collision: "skip",
      })
    ).toThrow("Figma variable alias cycle");
  });

  test("resolves Figma alias chains independently for every requested mode", () => {
    const collection = (prefix: string) => ({
      defaultModeId: `${prefix}-light`,
      modes: [
        { modeId: `${prefix}-light`, name: "Light" },
        { modeId: `${prefix}-dark`, name: "Dark" },
      ],
    });
    const aliasesByMode = (collectionId: string, targetId: string) => ({
      [`${collectionId}-light`]: { type: "VARIABLE_ALIAS", id: targetId },
      [`${collectionId}-dark`]: { type: "VARIABLE_ALIAS", id: targetId },
    });
    const document = {
      meta: {
        variableCollections: {
          primitive: collection("primitive"),
          semantic: collection("semantic"),
          component: collection("component"),
        },
        variables: {
          primitive: {
            name: "Color/Primitive",
            resolvedType: "COLOR",
            variableCollectionId: "primitive",
            valuesByMode: {
              "primitive-light": { r: 1, g: 1, b: 1, a: 0.75 },
              "primitive-dark": { r: 0, g: 0, b: 0, a: 0.25 },
            },
          },
          semantic: {
            name: "Color/Semantic",
            resolvedType: "COLOR",
            variableCollectionId: "semantic",
            valuesByMode: aliasesByMode("semantic", "primitive"),
          },
          component: {
            name: "Color/Component",
            resolvedType: "COLOR",
            variableCollectionId: "component",
            valuesByMode: aliasesByMode("component", "semantic"),
          },
        },
      },
    };
    const normalizeMode = (mode: string) =>
      normalizeDesignTokenImport({
        source: { format: "figma", document, mode },
        collision: "skip",
      }).find(({ path }) => path === "Color/Component")?.cssValue;

    expect(normalizeMode("Light")).toBe("rgb(255 255 255 / 0.75)");
    expect(normalizeMode("Dark")).toBe("rgb(0 0 0 / 0.25)");
    expect(
      normalizeDesignTokenImport({
        source: { format: "figma", document, allModes: true },
        collision: "skip",
      })
        .filter(({ path }) => path.startsWith("Color/Component/"))
        .map(({ outputName, cssValue }) => [outputName, cssValue])
    ).toEqual([
      ["--color-component-light", "rgb(255 255 255 / 0.75)"],
      ["--color-component-dark", "rgb(0 0 0 / 0.25)"],
    ]);
  });

  test("preserves falsy Figma variable values", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "figma",
        document: {
          variables: {
            number: {
              name: "Value/Zero",
              resolvedType: "FLOAT",
              valuesByMode: { default: 0 },
            },
            boolean: {
              name: "Value/False",
              resolvedType: "BOOLEAN",
              valuesByMode: { default: false },
            },
            string: {
              name: "Value/Empty",
              resolvedType: "STRING",
              valuesByMode: { default: "" },
            },
          },
        },
      },
      collision: "skip",
    });

    expect(tokens.map(({ cssValue }) => cssValue)).toEqual(["0", "false", ""]);
  });

  test("rejects malformed Figma aliases before converting their value", () => {
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "figma",
          document: {
            variables: {
              alias: {
                name: "Color/Alias",
                resolvedType: "COLOR",
                valuesByMode: { default: { type: "VARIABLE_ALIAS" } },
              },
            },
          },
        },
        collision: "skip",
      })
    ).toThrow("Figma variable Color/Alias has an invalid alias");
  });

  test("rejects Figma names that collide after CSS name normalization", () => {
    const state = createState();
    const variable = (name: string) => ({
      name,
      resolvedType: "STRING",
      valuesByMode: { default: "value" },
    });

    expect(() =>
      importDesignTokens(
        state,
        {
          source: {
            format: "figma",
            document: {
              variables: {
                first: variable("Color / Accent"),
                second: variable("color-accent"),
              },
            },
          },
          collision: "skip",
        },
        { createId: createId() }
      )
    ).toThrow("Multiple source tokens map to --color-accent");
  });

  test("supports DTCG token and property references with escaped JSON Pointers", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          "palette/base": {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0.2, 0.4, 0.6],
              alpha: 0.8,
            },
          },
          alias: { $type: "color", $ref: "#/palette~1base" },
          alpha: {
            $type: "number",
            $ref: "#/palette~1base/$value/alpha",
          },
          composed: {
            $type: "color",
            $value: {
              colorSpace: "srgb",
              components: [0.1, 0.2, 0.3],
              alpha: { $ref: "#/palette~1base/$value/alpha" },
            },
          },
        },
      },
      collision: "skip",
    });

    expect(tokens.map(({ path, cssValue }) => [path, cssValue])).toEqual([
      ["palette/base", "rgb(51 102 153 / 0.8)"],
      ["alias", "rgb(51 102 153 / 0.8)"],
      ["alpha", "0.8"],
      ["composed", "rgb(26 51 77 / 0.8)"],
    ]);
  });

  test("resolves DTCG group extensions with local overrides", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          base: {
            $type: "dimension",
            small: { $value: { value: 4, unit: "px" } },
            medium: { $value: { value: 8, unit: "px" } },
          },
          compact: {
            $extends: "{base}",
            medium: { $value: { value: 6, unit: "px" } },
            large: { $value: { value: 12, unit: "px" } },
          },
        },
      },
      collision: "skip",
    });

    expect(tokens.map(({ path, cssValue }) => [path, cssValue])).toEqual([
      ["base.small", "4px"],
      ["base.medium", "8px"],
      ["compact.small", "4px"],
      ["compact.medium", "6px"],
      ["compact.large", "12px"],
    ]);
  });

  test("imports DTCG $root as the group token and preserves its pointer", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          spacing: {
            $type: "dimension",
            $root: { $value: { value: 8, unit: "px" } },
            compact: { $ref: "#/spacing/$root" },
          },
          alias: { $ref: "#/spacing/$root" },
        },
      },
      collision: "skip",
    });

    expect(tokens.map(({ path, cssValue }) => [path, cssValue])).toEqual([
      ["spacing", "8px"],
      ["spacing.compact", "8px"],
      ["alias", "8px"],
    ]);
  });

  test("rejects missing, token, and circular DTCG group extensions", () => {
    const normalize = (document: Record<string, unknown>) =>
      normalizeDesignTokenImport({
        source: { format: "dtcg", document },
        collision: "skip",
      });

    expect(() =>
      normalize({ group: { $extends: "{missing}", token: { $value: 1 } } })
    ).toThrow("extends missing or invalid group");
    expect(() =>
      normalize({
        token: { $type: "number", $value: 1 },
        group: { $extends: "{token}", child: { $value: 2 } },
      })
    ).toThrow("extends missing or invalid group");
    expect(() =>
      normalize({
        first: { $extends: "{second}", token: { $value: 1 } },
        second: { $extends: "{first}", token: { $value: 2 } },
      })
    ).toThrow("DTCG group extension cycle");
  });

  test("resolves stable DTCG resolver sets and modifier contexts in order", () => {
    const document = {
      version: "2025.10",
      sets: {
        foundation: {
          sources: [
            {
              color: {
                $type: "color",
                text: { $value: "black" },
              },
              spacing: {
                $type: "dimension",
                small: { $value: { value: 4, unit: "px" } },
              },
            },
          ],
        },
      },
      modifiers: {
        theme: {
          default: "light",
          contexts: {
            light: [{ color: { $type: "color", text: { $value: "black" } } }],
            dark: [{ color: { $type: "color", text: { $value: "white" } } }],
          },
        },
      },
      resolutionOrder: [
        { $ref: "#/sets/foundation" },
        { $ref: "#/modifiers/theme" },
      ],
    };
    const normalize = (contexts?: Record<string, string>) =>
      normalizeDesignTokenImport({
        source: { format: "dtcg", document, contexts },
        collision: "skip",
      }).map(({ path, cssValue }) => [path, cssValue]);

    expect(normalize()).toEqual([
      ["color.text", "black"],
      ["spacing.small", "4px"],
    ]);
    expect(normalize({ theme: "dark" })).toEqual([
      ["color.text", "white"],
      ["spacing.small", "4px"],
    ]);
  });

  test("resolves bundled external DTCG resolver sources", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          version: "2025.10",
          resolutionOrder: [
            {
              type: "set",
              name: "foundation",
              sources: [{ $ref: "foundation.json" }],
            },
          ],
        },
        documents: {
          "foundation.json": {
            spacing: {
              $type: "dimension",
              small: { $value: { value: 4, unit: "px" } },
            },
          },
        },
      },
      collision: "skip",
    });

    expect(tokens.map(({ path, cssValue }) => [path, cssValue])).toEqual([
      ["spacing.small", "4px"],
    ]);
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            version: "2025.10",
            resolutionOrder: [
              {
                type: "set",
                name: "missing",
                sources: [{ $ref: "missing.json" }],
              },
            ],
          },
        },
        collision: "skip",
      })
    ).toThrow("was not provided in source.documents");
  });

  test("serializes all DTCG composite token types without losing sub-values", () => {
    const dimension = (value: number) => ({ value, unit: "px" });
    const color = {
      colorSpace: "srgb",
      components: [0, 0, 0],
      alpha: 0.5,
    };
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          stroke: {
            $type: "strokeStyle",
            $value: {
              dashArray: [dimension(2), dimension(4)],
              lineCap: "round",
            },
          },
          border: {
            $type: "border",
            $value: { color, width: dimension(1), style: "solid" },
          },
          transition: {
            $type: "transition",
            $value: {
              duration: { value: 200, unit: "ms" },
              delay: { value: 50, unit: "ms" },
              timingFunction: [0.2, 0, 0.4, 1],
            },
          },
          shadow: {
            $type: "shadow",
            $value: {
              color,
              offsetX: dimension(0),
              offsetY: dimension(2),
              blur: dimension(8),
              spread: dimension(0),
              inset: true,
            },
          },
          gradient: {
            $type: "gradient",
            $value: [
              { color, position: 0 },
              { color: "white", position: 1 },
            ],
          },
          typography: {
            $type: "typography",
            $value: {
              fontFamily: ["Inter", "sans-serif"],
              fontSize: dimension(16),
              fontWeight: "semi-bold",
              letterSpacing: dimension(1),
              lineHeight: 1.5,
            },
          },
        },
      },
      collision: "skip",
    });

    expect(
      Object.fromEntries(
        tokens.map(({ outputName, cssValue }) => [outputName, cssValue])
      )
    ).toEqual({
      "--stroke-dash-array": "2px 4px",
      "--stroke-line-cap": "round",
      "--border": "1px solid rgb(0 0 0 / 0.5)",
      "--transition": "200ms cubic-bezier(0.2, 0, 0.4, 1) 50ms",
      "--shadow": "inset 0px 2px 8px 0px rgb(0 0 0 / 0.5)",
      "--gradient": "linear-gradient(90deg, rgb(0 0 0 / 0.5) 0%, white 100%)",
      "--typography-font-family": '"Inter", sans-serif',
      "--typography-font-size": "16px",
      "--typography-font-weight": "600",
      "--typography-letter-spacing": "1px",
      "--typography-line-height": "1.5",
    });
  });

  test("resolves aliases inside DTCG composite values", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          color: {
            $type: "color",
            shadow: { $value: "rgb(0 0 0 / 0.25)" },
          },
          size: {
            $type: "dimension",
            zero: { $value: { value: 0, unit: "px" } },
            medium: { $value: { value: 8, unit: "px" } },
          },
          shadow: {
            $type: "shadow",
            $value: {
              color: "{color.shadow}",
              offsetX: "{size.zero}",
              offsetY: "{size.medium}",
              blur: { $ref: "#/size/medium/$value" },
              spread: "{size.zero}",
            },
          },
        },
      },
      collision: "skip",
    });

    expect(tokens.find(({ path }) => path === "shadow")?.cssValue).toBe(
      "0px 8px 8px 0px rgb(0 0 0 / 0.25)"
    );
  });

  test("imports DTCG typography as one design token with canonical declarations", () => {
    const state = createState();
    const mutation = importDesignTokens(
      state,
      {
        source: {
          format: "dtcg",
          document: {
            body: {
              $type: "typography",
              $value: {
                fontFamily: "Inter",
                fontSize: { value: 16, unit: "px" },
                fontWeight: 500,
                letterSpacing: { value: 0, unit: "px" },
                lineHeight: 1.5,
              },
            },
          },
        },
        mapping: {
          typography: { target: "design-token", property: "font" },
        },
        collision: "skip",
      },
      { createId: createId() }
    );
    const updated = applyBuilderPatchTransactions(state, [
      { id: "import", payload: mutation.payload },
    ]).state;
    const token = Array.from(updated.styleSources?.values() ?? []).find(
      (source) => source.type === "token" && source.name === "body"
    );

    expect(mutation.result.counts).toEqual({
      create: 1,
      overwrite: 0,
      skip: 0,
    });
    expect(
      Array.from(updated.styles?.values() ?? [])
        .filter((style) => style.styleSourceId === token?.id)
        .map((style) => [style.property, style.value])
    ).toEqual(
      expect.arrayContaining([
        ["fontFamily", { type: "unparsed", value: '"Inter"' }],
        ["fontSize", { type: "unparsed", value: "16px" }],
        ["fontWeight", { type: "unparsed", value: "500" }],
        ["letterSpacing", { type: "unparsed", value: "0px" }],
        ["lineHeight", { type: "unparsed", value: "1.5" }],
      ])
    );
  });

  test("rejects unknown DTCG properties and modifier source references", () => {
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            group: {
              $unknown: {},
              token: { $type: "number", $value: 1 },
            },
          },
        },
        collision: "skip",
      })
    ).toThrow("has unknown property $unknown");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            version: "2025.10",
            modifiers: {
              theme: {
                default: "light",
                contexts: { light: [] },
              },
            },
            resolutionOrder: [
              {
                type: "set",
                name: "invalid",
                sources: [{ $ref: "#/modifiers/theme" }],
              },
            ],
          },
        },
        collision: "skip",
      })
    ).toThrow("cannot reference a modifier");
  });

  test("validates DTCG metadata and gradient stop positions", () => {
    const normalize = (document: Record<string, unknown>) =>
      normalizeDesignTokenImport({
        source: { format: "dtcg", document },
        collision: "skip",
      });

    expect(() =>
      normalize({ token: { $type: "number", $value: 1, $unknown: true } })
    ).toThrow("has unknown property $unknown");
    expect(() =>
      normalize({
        group: {
          $description: false,
          token: { $type: "number", $value: 1 },
        },
      })
    ).toThrow("has invalid $description");
    expect(() =>
      normalize({
        gradient: {
          $type: "gradient",
          $value: [{ color: "red", position: 1.1 }],
        },
      })
    ).toThrow("has an invalid gradient value");
  });

  test("rejects circular and unresolved DTCG JSON Pointer references", () => {
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            first: { $type: "color", $ref: "#/second" },
            second: { $type: "color", $ref: "#/first" },
          },
        },
        collision: "skip",
      })
    ).toThrow("DTCG alias cycle");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            missing: { $type: "color", $ref: "#/does-not-exist" },
          },
        },
        collision: "skip",
      })
    ).toThrow("DTCG reference #/does-not-exist does not exist");
  });

  test("inherits DTCG types through chained references", () => {
    const tokens = normalizeDesignTokenImport({
      source: {
        format: "dtcg",
        document: {
          base: { $type: "dimension", $value: { value: 4, unit: "px" } },
          semantic: { $ref: "#/base" },
          component: { $value: "{semantic}" },
        },
      },
      collision: "skip",
    });

    expect(
      tokens.map(({ path, type, cssValue }) => [path, type, cssValue])
    ).toEqual([
      ["base", "dimension", "4px"],
      ["semantic", "dimension", "4px"],
      ["component", "dimension", "4px"],
    ]);
  });

  test("does not interpret JSON Pointer-looking strings as DTCG references", () => {
    expect(
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            family: { $type: "fontFamily", $value: "#/docs/getting-started" },
          },
        },
        collision: "skip",
      })[0]?.cssValue
    ).toBe('"#/docs/getting-started"');
  });

  test("rejects invalid DTCG names and reference declarations", () => {
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            "color.primary": { $type: "color", $value: "red" },
            color: {
              primary: { $type: "color", $value: "blue" },
            },
          },
        },
        collision: "skip",
      })
    ).toThrow("DTCG token or group color.primary has an invalid name");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            invalid: {
              $type: "color",
              $value: "red",
              $ref: "#/other",
            },
          },
        },
        collision: "skip",
      })
    ).toThrow("cannot define both $value and $ref");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            invalid: { $type: "color", $ref: "https://example.com/tokens" },
          },
        },
        collision: "skip",
      })
    ).toThrow("is not a local JSON Pointer");
  });

  test.each([
    "{color.primary",
    "color.primary}",
    "{color..primary}",
    "{color.$invalid}",
  ])("rejects malformed DTCG reference %s", (reference) => {
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            alias: { $type: "color", $value: reference },
          },
        },
        collision: "skip",
      })
    ).toThrow(`DTCG reference ${JSON.stringify(reference)} is invalid`);
  });

  test("accepts numeric DTCG path segments", () => {
    expect(
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            color: {
              $type: "color",
              blue: { "500": { $value: "#0066cc" } },
              accent: { $value: "{color.blue.500}" },
            },
          },
        },
        collision: "skip",
      }).map(({ path, cssValue }) => [path, cssValue])
    ).toEqual([
      ["color.blue.500", "#0066cc"],
      ["color.accent", "#0066cc"],
    ]);
  });

  test.each([
    [
      "unknown type",
      { invalid: { $type: "unknown", $value: 1 } },
      "invalid $type",
    ],
    [
      "number with a string value",
      { invalid: { $type: "number", $value: "1" } },
      "invalid number value",
    ],
    [
      "color with a missing component",
      {
        invalid: {
          $type: "color",
          $value: { colorSpace: "srgb", components: [0, 0] },
        },
      },
      "invalid color value",
    ],
    [
      "color with alpha outside its range",
      {
        invalid: {
          $type: "color",
          $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 2 },
        },
      },
      "invalid color value",
    ],
    [
      "empty font family list",
      { invalid: { $type: "fontFamily", $value: [] } },
      "invalid fontFamily value",
    ],
    [
      "cubic Bezier with an invalid x coordinate",
      { invalid: { $type: "cubicBezier", $value: [2, 0, 0.5, 1] } },
      "invalid cubicBezier value",
    ],
  ])("rejects DTCG %s", (_case, document, message) => {
    expect(() =>
      normalizeDesignTokenImport({
        source: { format: "dtcg", document },
        collision: "skip",
      })
    ).toThrow(message);
  });

  test("skips collisions without changing the project", () => {
    const state = createState();
    setupRootStyleSource(state);
    state.styles?.set("root-local:base:--brand-color:", {
      styleSourceId: "root-local",
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

  test("preflights and deterministically renames CSS variable collisions", () => {
    const state = createState();
    setupRootStyleSource(state);
    for (const property of ["--color", "--color-1"] as const) {
      state.styles?.set(`root-local:base:${property}:`, {
        styleSourceId: "root-local",
        breakpointId: "base",
        property,
        value: { type: "unparsed", value: "old" },
      });
    }
    const input = {
      source: {
        format: "dtcg" as const,
        document: {
          color: { $type: "color", $value: "#123456" },
          "color-2": { $type: "color", $value: "#abcdef" },
        },
      },
      collision: "rename" as const,
    };

    const plan = planDesignTokenImport(state, input);

    expect(plan).toEqual([
      expect.objectContaining({ outputName: "--color-3", action: "create" }),
      expect.objectContaining({ outputName: "--color-2", action: "create" }),
    ]);
    expect(state.styles?.has("root-local:base:--color-3:")).toBe(false);

    const mutation = importDesignTokens(state, input, { createId: createId() });
    const updated = applyBuilderPatchTransactions(state, [
      { id: "import", payload: mutation.payload },
    ]).state;
    expect(updated.styles?.get("root-local:base:--color:")?.value).toEqual({
      type: "unparsed",
      value: "old",
    });
    expect(updated.styles?.get("root-local:base:--color-3:")?.value).toEqual({
      type: "unparsed",
      value: "#123456",
    });
  });

  test("renames colliding design tokens and overwrites CSS variables", () => {
    const state = createState();
    setupRootStyleSource(state);
    state.styles?.set("root-local:base:--spacing:", {
      styleSourceId: "root-local",
      breakpointId: "base",
      property: "--spacing",
      value: { type: "unparsed", value: "4px" },
    });
    state.styleSources?.set("color-token", {
      id: "color-token",
      type: "token",
      name: "color",
    });

    const overwrite = importDesignTokens(
      state,
      {
        source: {
          format: "dtcg",
          document: {
            spacing: {
              $type: "dimension",
              $value: { value: 8, unit: "px" },
            },
          },
        },
        collision: "overwrite",
      },
      { createId: createId() }
    );
    const overwritten = applyBuilderPatchTransactions(state, [
      { id: "overwrite", payload: overwrite.payload },
    ]).state;
    expect(
      overwritten.styles?.get("root-local:base:--spacing:")?.value
    ).toEqual({ type: "unparsed", value: "8px" });

    const rename = importDesignTokens(
      state,
      {
        source: {
          format: "dtcg",
          document: { color: { $type: "color", $value: "#123456" } },
        },
        mapping: { color: { target: "design-token", property: "color" } },
        collision: "rename",
      },
      { createId: createId() }
    );
    const renamed = applyBuilderPatchTransactions(state, [
      { id: "rename", payload: rename.payload },
    ]).state;
    expect(
      Array.from(renamed.styleSources?.values() ?? []).find(
        (source) => source.type === "token" && source.name === "color-1"
      )
    ).toBeDefined();
  });

  test("distinguishes matching values from conflicts during preflight", () => {
    const state = createState();
    setupRootStyleSource(state);
    state.styles?.set("root-local:base:--color:", {
      styleSourceId: "root-local",
      breakpointId: "base",
      property: "--color",
      value: { type: "unparsed", value: "#123456" },
    });
    const plan = planDesignTokenImport(state, {
      source: {
        format: "dtcg",
        document: { color: { $type: "color", $value: "#123456" } },
      },
      collision: "rename",
    });

    expect(plan).toEqual([
      expect.objectContaining({
        outputName: "--color",
        action: "skip",
        conflict: false,
      }),
    ]);
  });

  test("treats extra design token declarations as a conflict", () => {
    const state = createState();
    state.styleSources?.set("color-token", {
      id: "color-token",
      type: "token",
      name: "color",
    });
    state.styles?.set("color-token:base:color:", {
      styleSourceId: "color-token",
      breakpointId: "base",
      property: "color",
      value: { type: "unparsed", value: "#123456" },
    });
    state.styles?.set("color-token:base:backgroundColor:", {
      styleSourceId: "color-token",
      breakpointId: "base",
      property: "backgroundColor",
      value: { type: "unparsed", value: "#123456" },
    });

    const plan = planDesignTokenImport(state, {
      source: {
        format: "dtcg",
        document: { color: { $type: "color", $value: "#123456" } },
      },
      mapping: { color: { target: "design-token", property: "color" } },
      collision: "skip",
    });

    expect(plan).toEqual([
      expect.objectContaining({
        outputName: "color",
        action: "skip",
        conflict: true,
      }),
    ]);
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
    ).toMatchObject({ name: "color-primary" });
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

  test("rejects missing aliases and invalid composite values", () => {
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
    ).toThrow("invalid typography value");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            first: { $type: "color", $value: "{second}" },
            second: { $type: "color", $value: "{first}" },
          },
        },
        collision: "skip",
      })
    ).toThrow("DTCG alias cycle");
  });

  test("rejects invalid DTCG structures, types, and units", () => {
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: { missingType: { $value: 1 } },
        },
        collision: "skip",
      })
    ).toThrow("is missing $type");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            color: { $type: "color", $value: "red" },
            alias: { $type: "number", $value: "{color}" },
          },
        },
        collision: "skip",
      })
    ).toThrow("has type number but aliases color");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            spacing: {
              $type: "dimension",
              $value: { value: 1, unit: "em" },
            },
          },
        },
        collision: "skip",
      })
    ).toThrow("invalid dimension unit em");
    expect(() =>
      normalizeDesignTokenImport({
        source: {
          format: "dtcg",
          document: {
            invalid: {
              $type: "number",
              $value: 1,
              child: { $value: 2 },
            },
          },
        },
        collision: "skip",
      })
    ).toThrow("cannot contain child tokens or groups");
  });

  test("scopes CSS variable collisions to the root and selected breakpoint", () => {
    const state = createState();
    state.breakpoints?.set("mobile", {
      id: "mobile",
      label: "Mobile",
      maxWidth: 767,
    });
    setupRootStyleSource(state);
    state.styleSources?.set("component-local", {
      id: "component-local",
      type: "local",
    });
    state.styles?.set("component-local:base:--color:", {
      styleSourceId: "component-local",
      breakpointId: "base",
      property: "--color",
      value: { type: "unparsed", value: "component" },
    });
    state.styles?.set("root-local:mobile:--color:", {
      styleSourceId: "root-local",
      breakpointId: "mobile",
      property: "--color",
      value: { type: "unparsed", value: "mobile" },
    });

    const mutation = importDesignTokens(
      state,
      {
        source: {
          format: "dtcg",
          document: { color: { $type: "color", $value: "#123456" } },
        },
        collision: "skip",
      },
      { createId: createId() }
    );
    const updated = applyBuilderPatchTransactions(state, [
      { id: "import", payload: mutation.payload },
    ]).state;

    expect(mutation.result.counts).toEqual({
      create: 1,
      overwrite: 0,
      skip: 0,
    });
    expect(updated.styles?.get("root-local:base:--color:")?.value).toEqual({
      type: "unparsed",
      value: "#123456",
    });
    expect(updated.styles?.get("root-local:mobile:--color:")?.value).toEqual({
      type: "unparsed",
      value: "mobile",
    });
    expect(updated.styles?.get("component-local:base:--color:")?.value).toEqual(
      {
        type: "unparsed",
        value: "component",
      }
    );
  });
});
